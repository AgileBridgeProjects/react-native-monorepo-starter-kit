using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using Bogus;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace StarterKit.WebApi.Tests.Infrastructure;

/// <summary>
/// Shared base class for all <c>StarterKit.WebApi.Tests</c> integration test classes.
///
/// Centralises:
/// <list type="bullet">
///   <item><description><see cref="WebApplicationFactory{TEntryPoint}"/> setup and the <c>Testing</c> environment settings.</description></item>
///   <item><description><see cref="TestAuthHandler"/> authentication scheme registration.</description></item>
///   <item><description>Common static helpers: <see cref="JsonOptions"/>, <see cref="Faker"/>, <see cref="TestClubId"/>.</description></item>
/// </list>
/// </summary>
public abstract class WebApiIntegrationTestBase : IClassFixture<WebApplicationFactory<Program>>
{
    protected WebApplicationFactory<Program> Factory { get; }

    protected static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    protected static readonly Faker Faker = new();
    protected static readonly Guid TestClubId = Guid.NewGuid();

    protected WebApiIntegrationTestBase(WebApplicationFactory<Program> factory)
    {
        Factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureLogging(logging => logging.ClearProviders());
            builder.UseSetting("ASPNETCORE_ENVIRONMENT", "Testing");
            builder.UseSetting(
                "ConnectionStrings:DefaultConnection",
                "Server=.;Database=StarterKit_Test;TrustServerCertificate=True"
            );
            builder.UseSetting("Firebase:Enabled", "false");
            builder.UseSetting("Games:EnableStaleSessionCleanupJob", "false");
            builder.UseSetting("KeyVault:Name", "");
            builder.UseSetting("AzureStorage:ConnectionString", "UseDevelopmentStorage=true");
            builder.UseSetting("Email:ApiKey", "re_test-placeholder");
            builder.UseSetting("Email:FromEmail", "test@example.com");
            builder.UseSetting("Email:FromName", "StarterKit Test");
            builder.UseSetting("Twilio:AccountSid", "ACtest000000000000000000000000000");
            builder.UseSetting("Twilio:AuthToken", "test-auth-token");
            builder.UseSetting("Twilio:FromNumber", "+15005550006");
        });
    }

    /// <summary>
    /// Creates an <see cref="HttpClient"/> wired with <see cref="TestAuthHandler"/> and
    /// the standard test environment settings. Pass an optional <paramref name="configureServices"/>
    /// callback to register controller-specific service mocks before auth is applied.
    /// </summary>
    protected HttpClient CreateClientWithAuth(Action<IServiceCollection>? configureServices = null)
    {
        var client = Factory
            .WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    configureServices?.Invoke(services);
                    services
                        .AddAuthentication()
                        .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                            TestAuthHandler.SchemeName,
                            _ => { }
                        );
                    services.PostConfigure<AuthenticationOptions>(o =>
                    {
                        o.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                        o.DefaultChallengeScheme = TestAuthHandler.SchemeName;
                    });

                    // Replace RoleClaimsTransformer with a no-op so tests never hit the
                    // real database during claims transformation. TestAuthHandler already
                    // provides the correct claims.
                    services.AddScoped<IClaimsTransformation>(_ => new NoOpClaimsTransformation());
                });
            })
            .CreateClient();

        client.DefaultRequestHeaders.Add(TestAuthHandler.ClubIdHeader, TestClubId.ToString());
        return client;
    }

    private sealed class NoOpClaimsTransformation : IClaimsTransformation
    {
        public Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal) =>
            Task.FromResult(principal);
    }
}
