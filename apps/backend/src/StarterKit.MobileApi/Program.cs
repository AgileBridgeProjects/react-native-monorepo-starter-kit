using System.Text.Json.Serialization;
using Azure.Identity;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;
using Scalar.AspNetCore;
using StarterKit.Auth.Extensions;
using StarterKit.Auth.RateLimiting;
using StarterKit.Core.Configuration;
using StarterKit.Core.Dev;
using StarterKit.Core.Dev.Options;
using StarterKit.Core.Extensions;
using StarterKit.Core.Observability;
using StarterKit.Core.PushNotifications.Interfaces;
using StarterKit.Core.PushNotifications.Jobs;
using StarterKit.Core.Storage;
using StarterKit.Mcp.Extensions;
using StarterKit.MobileApi.Dev;
using StarterKit.MobileApi.Middleware;
using StarterKit.MobileApi.PushNotifications;
using StarterKit.MobileApi.Support.Options;

var builder = WebApplication.CreateBuilder(args);

// Phase 1 — bootstrapping: bind Key Vault options from config before the DI container
// is built so that Key Vault secrets are available when all IOptions<T> bindings resolve.
// IOptions<T> cannot be used here because the container is not yet built.
// Locally: resolved via Azure CLI (az login).
// CI/production: resolved via OIDC / Managed Identity automatically.
var keyVaultOptions = builder
    .Configuration.GetSection(KeyVaultOptions.SectionName)
    .Get<KeyVaultOptions>();

if (keyVaultOptions?.IsConfigured == true)
{
    builder.Configuration.AddAzureKeyVault(
        new Uri($"https://{keyVaultOptions.Name}.vault.azure.net/"),
        new DefaultAzureCredential()
    );
    // Re-apply env vars and command-line args so they override Key Vault secrets.
    // This allows docker-compose environment: and command: entries to pin local values
    // (e.g. Azurite connection strings) without disabling Key Vault entirely.
    builder.Configuration.AddEnvironmentVariables();
    builder.Configuration.AddCommandLine(args);
}

// Phase 2 — DI registration: validates the Key Vault section at startup via ValidateOnStart.
builder
    .Services.AddOptions<KeyVaultOptions>()
    .BindConfiguration(KeyVaultOptions.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder
    .Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<StarterKit.MobileApi.Exceptions.ArgumentExceptionHandler>();
builder.Services.AddExceptionHandler<StarterKit.MobileApi.Exceptions.ValidationExceptionHandler>();
builder.Services.AddExceptionHandler<StarterKit.MobileApi.Exceptions.EntityNotFoundExceptionHandler>();
builder.Services.AddExceptionHandler<StarterKit.MobileApi.Exceptions.ConflictExceptionHandler>();
builder.Services.AddExceptionHandler<StarterKit.MobileApi.Exceptions.ConcurrencyExceptionHandler>();
builder.Services.AddStarterKitOpenApi();

// Application Insights + Serilog structured logging with PII redaction. See ObservabilityExtensions.
builder.Services.AddStarterKitObservability(builder.Configuration);

builder.Services.AddStarterKitRateLimiting(builder.Configuration);

// TimeProvider is shared infrastructure used across features. On a real local dev machine only
// (never a deployed Azure slot, even a misconfigured "Development" one — see DevClockGate),
// DevClockTimeProvider lets a dev freeze "now" via appsettings so SA-based devs can walk through
// US-timezone check-in slots on demand. See docs/standards/dev-timezone-testing.md.
if (DevClockGate.IsLocalDevelopment(builder.Environment, builder.Configuration))
{
    builder.Services.AddOptions<DevClockOptions>().BindConfiguration(DevClockOptions.SectionName);
    builder.Services.AddSingleton<TimeProvider, DevClockTimeProvider>();
}
else
{
    builder.Services.AddSingleton(TimeProvider.System);
}
builder.Services.AddStarterKitCore(builder.Configuration);
builder.Services.AddStarterKitAuth();

// MCP server: exposes this API's endpoints as MCP tools at Mcp:Path (see StarterKit.Mcp).
builder.Services.AddStarterKitMcp(typeof(Program).Assembly);

builder.Services.AddScoped<IDevBootstrapService, DevBootstrapService>();

builder
    .Services.AddOptions<CorsPolicyOptions>()
    .BindConfiguration(CorsPolicyOptions.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();

var corsOptions =
    builder.Configuration.GetSection(CorsPolicyOptions.SectionName).Get<CorsPolicyOptions>()
    ?? new CorsPolicyOptions();

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy
            .WithOrigins(corsOptions.AllowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()
    )
);

builder
    .Services.AddOptions<SupportOptions>()
    .BindConfiguration(SupportOptions.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services.AddAzureBlobStorage();

builder.Services.AddSignalR();

// Key hub connections by the StarterKit internal user GUID so IHubContext.Clients.User() resolves correctly.
builder.Services.AddSingleton<IUserIdProvider, InternalUserIdProvider>();

// Wire the SignalR broadcaster so PushNotificationsService can signal connected clients.
builder.Services.AddScoped<INotificationBroadcaster, SignalRNotificationBroadcaster>();

var hangfireConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");
var isTesting =
    builder.Environment.IsEnvironment("Testing")
    || string.Equals(
        builder.Configuration["ASPNETCORE_ENVIRONMENT"],
        "Testing",
        StringComparison.OrdinalIgnoreCase
    );
var useRealHangfireStorage =
    !isTesting
    && !string.IsNullOrWhiteSpace(hangfireConnectionString)
    && hangfireConnectionString != "#";

builder.Services.AddHangfire(config =>
{
    config
        .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
        .UseSimpleAssemblyNameTypeSerializer()
        .UseRecommendedSerializerSettings();

    if (useRealHangfireStorage)
        config.UsePostgreSqlStorage(options =>
            options.UseNpgsqlConnection(hangfireConnectionString)
        );
    else
        config.UseInMemoryStorage();
});

builder.Services.AddHangfireServer();

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

if (!useRealHangfireStorage && !app.Environment.IsDevelopment() && !isTesting)
{
    app.Logger.LogWarning(
        "Hangfire is running with InMemory storage. Queued jobs will not survive a restart. "
            + "Set a valid DefaultConnection string to enable durable SQL Server storage."
    );
}

app.UseForwardedHeaders();
app.UseExceptionHandler();
app.UseHttpsRedirection();
app.UseCors();
app.UseRouting();
app.UseStarterKitAuth(); // Authentication must run before rate limiting to enable user-ID partitioning
app.UseRateLimiter(); // Must be after UseRouting() and UseStarterKitAuth() so context.User is populated

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

// The Hangfire dashboard has no built-in authorization (Authorization = [] below) and must
// never be reachable on a deployed slot — gate it to an actual local developer machine, not
// just IsDevelopment(), so the Azure "dev" App Service (a public URL, no network restriction,
// which does identify as Development per the identity split) never exposes it. See DevClockGate for the
// same WEBSITE_SITE_NAME defense-in-depth reasoning.
if (DevClockGate.IsLocalDevelopment(app.Environment, app.Configuration))
{
    app.UseHangfireDashboard("/hangfire", new DashboardOptions { Authorization = [] });
}

app.MapControllers()
    .Add(endpointBuilder =>
    {
        var hasExplicitRateLimit = endpointBuilder
            .Metadata.OfType<EnableRateLimitingAttribute>()
            .Any();
        var hasRateLimitDisabled = endpointBuilder
            .Metadata.OfType<DisableRateLimitingAttribute>()
            .Any();

        if (!hasExplicitRateLimit && !hasRateLimitDisabled)
            endpointBuilder.Metadata.Add(
                new EnableRateLimitingAttribute(RateLimitPolicies.ApiDefault)
            );
    });
app.MapStarterKitMcp(RateLimitPolicies.ApiDefault);
app.MapHub<NotificationHub>("/hubs/notifications");
app.MapGet("/", () => Results.Ok(new { service = "StarterKit.MobileApi", status = "ok" }));
app.MapGet("/healthz", () => Results.Ok(new { status = "healthy" }));

app.UseMiddleware<UpdateLastActiveMiddleware>();

if (useRealHangfireStorage)
{
    var recurringJobs = app.Services.GetRequiredService<IRecurringJobManager>();

    recurringJobs.AddOrUpdate<PushNotificationSweepJob>(
        "push-notification-sweep",
        job => job.ExecuteAsync(CancellationToken.None),
        "*/30 * * * *"
    );
}

app.Run();

// Expose the type for WebApplicationFactory in integration tests.
public partial class Program { }
