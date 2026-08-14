using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using StarterKit.MobileApi.Tests.Infrastructure;

namespace StarterKit.MobileApi.Tests.Auth;

/// <summary>
/// Integration tests for <c>DisabledUserMiddleware</c> which rejects authenticated requests
/// that carry no <c>internal_user_id</c> claim (i.e. disabled or unregistered users).
/// </summary>
public abstract class DisabledUserMiddlewareTests : MobileApiIntegrationTestBase
{
    protected DisabledUserMiddlewareTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    // ── Authenticated + internal_user_id present ─────────────────────────────

    public sealed class EnabledUser_CanReachEndpoint : DisabledUserMiddlewareTests
    {
        public EnabledUser_CanReachEndpoint(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns_NotForbidden_WhenAuthenticatedWithInternalUserIdClaim()
        {
            // MobileApi TestAuthHandler defaults internal_user_id to Guid.Empty —
            // the middleware should pass and let the controller handle the request.
            var client = CreateClientWithAuth();

            var response = await client.GetAsync("/api/auth/me");

            // Controller may return 200 or 403 (no club linked) but must NOT be
            // blocked by DisabledUserMiddleware with a plain 403.
            response.StatusCode.Should().NotBe(HttpStatusCode.Forbidden);
        }
    }

    // ── Authenticated but internal_user_id absent (disabled / unregistered) ──

    public sealed class DisabledUser_IsRejectedWithForbidden : DisabledUserMiddlewareTests
    {
        public DisabledUser_IsRejectedWithForbidden(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns403_WhenAuthenticatedButNoInternalUserIdClaim()
        {
            var client = CreateClientWithAuth();
            client.DefaultRequestHeaders.Add(TestAuthHandler.NoInternalUserIdHeader, "true");

            var response = await client.GetAsync("/api/auth/me");

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }
    }

    // ── Unauthenticated request ───────────────────────────────────────────────

    public sealed class UnauthenticatedRequest_Returns401 : DisabledUserMiddlewareTests
    {
        public UnauthenticatedRequest_Returns401(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns401_WhenRequestIsNotAuthenticated()
        {
            var client = Factory
                .WithWebHostBuilder(builder =>
                {
                    builder.UseSetting("ASPNETCORE_ENVIRONMENT", "Testing");
                    builder.UseSetting("Anthropic:ApiKey", "test-key");
                    builder.UseSetting(
                        "ConnectionStrings:DefaultConnection",
                        "Server=.;Database=StarterKit_Test;TrustServerCertificate=True"
                    );
                    builder.UseSetting("Firebase:Enabled", "false");
                    builder.UseSetting(
                        "AzureStorage:ConnectionString",
                        "UseDevelopmentStorage=true"
                    );
                })
                .CreateClient();

            var response = await client.GetAsync("/api/auth/me");

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}
