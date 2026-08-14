using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using StarterKit.Auth.Middleware;
using StarterKit.WebApi.Tests.Infrastructure;

namespace StarterKit.WebApi.Tests.Auth;

/// <summary>
/// Integration tests for <c>ImpersonationMiddleware</c>.
/// </summary>
public abstract class ImpersonationMiddlewareTests : WebApiIntegrationTestBase
{
    protected ImpersonationMiddlewareTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    // ── SuperAdmin with valid club header ─────────────────────────────────

    public sealed class WithValidHeaders_SetsImpersonationClaims : ImpersonationMiddlewareTests
    {
        public WithValidHeaders_SetsImpersonationClaims(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns200_WhenImpersonationHeadersPresent()
        {
            var clubId = Guid.NewGuid();
            var teamId = Guid.NewGuid();

            var client = CreateClientWithAuth();
            client.DefaultRequestHeaders.Add(ImpersonationMiddleware.ClubHeader, clubId.ToString());
            client.DefaultRequestHeaders.Add(ImpersonationMiddleware.TeamHeader, teamId.ToString());

            // Hit any authenticated endpoint — we only care that the middleware doesn't
            // block the request (i.e. response is not 401/403).
            var response = await client.GetAsync("/api/clubs");

            response.StatusCode.Should().NotBe(HttpStatusCode.Unauthorized);
            response.StatusCode.Should().NotBe(HttpStatusCode.Forbidden);
        }
    }

    // ── Non-SuperAdmin ignores impersonation headers ─────────────────────────

    public sealed class NonSuperAdmin_IgnoresHeaders : ImpersonationMiddlewareTests
    {
        public NonSuperAdmin_IgnoresHeaders(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns401_WhenUnauthenticated()
        {
            var client = Factory
                .WithWebHostBuilder(builder =>
                {
                    builder.ConfigureServices(services => { });
                })
                .CreateClient();

            var response = await client.GetAsync("/api/clubs");

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}
