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
using StarterKit.Core.Auditing.Jobs;
using StarterKit.Core.Configuration;
using StarterKit.Core.Dev;
using StarterKit.Core.Dev.Options;
using StarterKit.Core.Extensions;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Observability;
using StarterKit.Core.Reports.Interfaces.Services;
using StarterKit.Core.Reports.Services;
using StarterKit.Core.Storage;
using StarterKit.Core.Users.Jobs;
using StarterKit.Mcp.Extensions;
using StarterKit.WebApi.Dev;
using StarterKit.WebApi.Exceptions;
using StarterKit.WebApi.Realtime;
using StarterKit.WebApi.Session;
using StarterKit.WebApi.Users;

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

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<BulkUploadExceptionHandler>();
builder.Services.AddExceptionHandler<ArgumentExceptionHandler>();
builder.Services.AddExceptionHandler<ValidationExceptionHandler>();
builder.Services.AddExceptionHandler<ConflictExceptionHandler>();
builder.Services.AddExceptionHandler<EntityNotFoundExceptionHandler>();

builder.Services.AddStarterKitCore(builder.Configuration);
builder.Services.AddStarterKitAuth();

// MCP server: exposes this API's endpoints as MCP tools at Mcp:Path (see StarterKit.Mcp).
builder.Services.AddStarterKitMcp(typeof(Program).Assembly);

// SignalR + a single IUserIdProvider serving every hub (AI jobs, admin realtime, session).
// InternalUserIdProvider maps the internal_user_id claim — the same mapping the AI-job hub
// previously registered via its own provider, so one registration covers all hubs.
builder.Services.AddSignalR();
builder.Services.AddSingleton<IUserIdProvider, InternalUserIdProvider>();

// Session management — server-side idle/absolute timeout pushed to clients via SignalR.
builder
    .Services.AddOptions<SessionTimeoutOptions>()
    .BindConfiguration(SessionTimeoutOptions.Section)
    .ValidateDataAnnotations()
    .ValidateOnStart();
builder.Services.AddSingleton<ISessionTracker, SessionTracker>();
builder.Services.AddHostedService<SessionMonitorService>();

// Must be registered after AddStarterKitCore() so this overrides NoOpReportExportBroadcaster.
builder.Services.AddScoped<
    StarterKit.Core.Reports.Interfaces.Services.IReportExportBroadcaster,
    StarterKit.WebApi.Reports.Realtime.ReportExportSignalRBroadcaster
>();

// Must be registered after AddStarterKitCore() so this overrides NoOpNotificationMessageBroadcaster.
builder.Services.AddScoped<
    StarterKit.Core.Notifications.Interfaces.INotificationMessageBroadcaster,
    StarterKit.WebApi.Notifications.Realtime.NotificationMessageSignalRBroadcaster
>();
builder.Services.AddAzureBlobStorage();
builder.Services.AddHostedService<SetupTokenExpiryService>();

if (builder.Environment.IsDevelopment())
    builder.Services.AddScoped<IDevBootstrapService, DevBootstrapService>();

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

// Default server drains the standard job queue (notifications, AI, reports, recurring jobs).
builder.Services.AddHangfireServer(options => options.Queues = ["default"]);

// Dedicated single-worker server for CPU-bound media work (H.265 video transcoding).
// Isolating it to its own "media" queue with WorkerCount = 1 guarantees at most one encode
// runs at a time and that it never starves the default workers — concurrent libx265 encodes
// on the shared App Service plan are what pinned the CPU and took the admin portal offline.
builder.Services.AddHangfireServer(options =>
{
    options.Queues = ["media"];
    options.WorkerCount = 1;
});

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
    {
        // AllowedOrigins supports exact origins for dev (e.g. http://localhost:3000).
        // SetIsOriginAllowed adds wildcard subdomain support for *.{BaseDomain}
        // in production without using the insecure AllowAnyOrigin().
        // BaseDomain is configurable via Cors__BaseDomain in App Settings or Key Vault.
        var baseDomain = corsOptions.BaseDomain;
        var exactOrigins = corsOptions.AllowedOrigins;

        policy
            .SetIsOriginAllowed(origin =>
            {
                if (exactOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
                    return true;
                if (
                    Uri.TryCreate(origin, UriKind.Absolute, out var uri)
                    && (
                        uri.Host.Equals(baseDomain, StringComparison.OrdinalIgnoreCase)
                        || uri.Host.EndsWith($".{baseDomain}", StringComparison.OrdinalIgnoreCase)
                    )
                )
                    return true;
                // Allow any *.localhost origin in Development for local multi-tenant testing
                if (
                    builder.Environment.IsDevelopment()
                    && Uri.TryCreate(origin, UriKind.Absolute, out var devUri)
                    && devUri.Host.EndsWith(".localhost", StringComparison.OrdinalIgnoreCase)
                )
                    return true;
                return false;
            })
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    })
);

var app = builder.Build();

if (!useRealHangfireStorage && !app.Environment.IsDevelopment() && !isTesting)
{
    app.Logger.LogWarning(
        "Hangfire is running with InMemory storage. Queued jobs will not survive a restart. "
            + "Set a valid DefaultConnection string to enable durable SQL Server storage."
    );
}

app.UseForwardedHeaders();
if (!isTesting)
{
    app.UseHttpsRedirection();
}
app.UseExceptionHandler();
app.UseCors();
app.UseRouting(); // Must be explicit so ImpersonationMiddleware can read endpoint metadata via context.GetEndpoint()
app.UseStarterKitAuth(); // Authentication must run before rate limiting to enable user-ID partitioning
app.UseRateLimiter(); // Must be after UseStarterKitAuth() so context.User is populated for user-ID partitioning
app.UseMiddleware<SessionActivityMiddleware>(); // Records activity on every authenticated API request

// Configure the HTTP request pipeline.
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

app.MapGet("/", () => Results.Ok(new { service = "StarterKit.WebApi", status = "ok" }));
app.MapGet("/healthz", () => Results.Ok(new { status = "healthy" }));
app.MapStarterKitMcp(RateLimitPolicies.ApiDefault);
app.MapHub<AdminRealtimeHub>("/hubs/admin-realtime");
app.MapHub<SessionHub>("/hubs/session");

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

// Register recurring background jobs for the KEEP domains.
if (useRealHangfireStorage)
{
    var recurringJobs = app.Services.GetRequiredService<IRecurringJobManager>();
    var backgroundJobs = app.Services.GetRequiredService<IBackgroundJobClient>();

    // Backfill any missing snapshot data on startup — finds the newest existing snapshot
    // and fills the gap to today.  Safe to run every restart (upsert pattern, idempotent).
    backgroundJobs.Enqueue<StartupSnapshotBackfillJob>(job =>
        job.ExecuteAsync(CancellationToken.None)
    );

    // POPIA/GDPR data retention: hard-delete setup tokens older than TokenRetentionDays.
    // Runs at 03:00 UTC daily — offset from the hourly SetupTokenExpiryService.
    recurringJobs.AddOrUpdate<SetupTokenCleanupJob>(
        "daily-setup-token-cleanup",
        job => job.ExecuteAsync(CancellationToken.None),
        "0 3 * * *"
    );

    // Purge downloaded full-dashboard export workbooks past their retention window so the
    // report-exports container doesn't grow unbounded (ABC-123).
    recurringJobs.AddOrUpdate<StarterKit.Core.Reports.Jobs.PurgeStaleReportExportsJob>(
        "purge-stale-report-exports",
        job => job.ExecuteAsync(CancellationToken.None),
        "0 4 * * *"
    );

    // POPIA/GDPR data retention: hard-delete audit log rows older than RetentionDays.
    // Runs at 02:00 UTC daily — offset from the 03:00 setup-token cleanup.
    recurringJobs.AddOrUpdate<AuditLogCleanupJob>(
        "daily-audit-log-cleanup",
        job => job.ExecuteAsync(CancellationToken.None),
        "0 2 * * *"
    );

    // Report snapshot refresh — nightly at 02:00 SAST (= 00:00 UTC)
    recurringJobs.AddOrUpdate<IReportSnapshotRefreshService>(
        "report-snapshot-refresh-nightly",
        job => job.ExecuteAsync(JobCancellationToken.Null),
        "0 0 * * *"
    );
}

app.Run();

public partial class Program { }
