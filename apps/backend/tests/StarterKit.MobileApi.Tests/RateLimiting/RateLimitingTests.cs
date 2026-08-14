using System.Net;
using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using StarterKit.MobileApi.Tests.Infrastructure;

namespace StarterKit.MobileApi.Tests.RateLimiting;

public abstract class RateLimitingTests : MobileApiIntegrationTestBase
{
    protected RateLimitingTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    /// <summary>
    /// Creates a factory with the ApiDefault permit limit set to 3 so tests can exhaust
    /// the quota without sending hundreds of requests.
    /// </summary>
    private WebApplicationFactory<Program> CreateLowLimitFactory() =>
        Factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("RateLimiting:ApiDefault:PermitLimit", "3");
            // The test host has no reachable DB, so these endpoints fail. Collapse EF's
            // retry-on-failure backoff (default 5 × 10 s) to a fast 1 × 100 ms so each failed
            // request returns quickly — otherwise a request hangs ~tens of seconds and the idle
            // rate-limiter partition is evicted between requests, resetting the permit count.
            builder.UseSetting("SqlResilience:MaxRetries", "1");
            builder.UseSetting("SqlResilience:RetryDelayMilliseconds", "100");
            builder.ConfigureServices(services =>
            {
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
                services.AddScoped<IClaimsTransformation>(_ => new NoOpTransformation());
            });
        });

    /// <summary>
    /// Creates an authenticated client from <paramref name="factory"/> with an optional
    /// user-ID header so tests can exercise per-user partition isolation.
    /// Both clients created from the same factory share one rate-limiter instance.
    /// </summary>
    private static HttpClient CreateAuthClient(
        WebApplicationFactory<Program> factory,
        string? userId = null
    )
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.ClubIdHeader, TestClubId.ToString());
        if (userId is not null)
            client.DefaultRequestHeaders.Add(TestAuthHandler.UserIdHeader, userId);
        return client;
    }

    private sealed class NoOpTransformation : IClaimsTransformation
    {
        public Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal) =>
            Task.FromResult(principal);
    }

    // ── ApiDefault baseline ───────────────────────────────────────────────────

    /// <summary>
    /// Verifies that the ApiDefault rate limit (applied via MapControllers convention)
    /// returns 429 after a single authenticated user exhausts their per-user quota.
    /// </summary>
    public sealed class ApiDefault_Returns429_WhenLimitExceeded : RateLimitingTests
    {
        public ApiDefault_Returns429_WhenLimitExceeded(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task ApiDefault_WhenAuthenticatedLimitExceeded_Returns429WithRetryAfter()
        {
            var client = CreateAuthClient(CreateLowLimitFactory(), Guid.NewGuid().ToString());

            // Exhaust the 3-request limit; individual responses may be non-200
            // (e.g. DB unavailable in test) but the rate limiter still counts each permit.
            for (var i = 0; i < 3; i++)
                await client.GetAsync("/api/push-notifications");

            var response = await client.GetAsync("/api/push-notifications");

            response.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
            response.Headers.Contains("Retry-After").Should().BeTrue();
        }
    }

    // ── Per-user partitioning ─────────────────────────────────────────────────

    /// <summary>
    /// Verifies that authenticated requests are partitioned by internal user ID, so
    /// exhausting user A's quota does not block user B.
    /// </summary>
    public sealed class ApiDefault_PartitionsByUserId : RateLimitingTests
    {
        public ApiDefault_PartitionsByUserId(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task ApiDefault_TwoDistinctUsers_DoNotShareRateLimitBucket()
        {
            // Both clients share the same factory (same rate-limiter singleton) but carry
            // different user IDs so they map to independent partition buckets.
            var lowLimitFactory = CreateLowLimitFactory();
            var clientA = CreateAuthClient(lowLimitFactory, Guid.NewGuid().ToString());
            var clientB = CreateAuthClient(lowLimitFactory, Guid.NewGuid().ToString());

            // User A exhausts their 3-request quota.
            for (var i = 0; i < 3; i++)
                await clientA.GetAsync("/api/push-notifications");

            var userAResponse = await clientA.GetAsync("/api/push-notifications");
            userAResponse.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);

            // User B has a separate partition — must NOT be rate limited yet.
            var userBResponse = await clientB.GetAsync("/api/push-notifications");
            userBResponse.StatusCode.Should().NotBe(HttpStatusCode.TooManyRequests);
        }
    }
}
