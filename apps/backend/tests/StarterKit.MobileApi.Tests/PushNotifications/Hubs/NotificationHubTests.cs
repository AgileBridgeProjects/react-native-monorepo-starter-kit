using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using StarterKit.Core.PushNotifications.Interfaces;
using StarterKit.MobileApi.Tests.Infrastructure;

namespace StarterKit.MobileApi.Tests.PushNotifications.Hubs;

/// <summary>
/// Integration tests for <c>NotificationHub</c> authentication.
///
/// The SignalR negotiate endpoint (<c>POST /hubs/notifications/negotiate</c>) runs through
/// the full ASP.NET Core auth pipeline, so these tests verify that:
/// <list type="bullet">
///   <item>An authenticated user receives a connection token (200).</item>
///   <item>An unauthenticated request is rejected (401).</item>
/// </list>
/// Full WebSocket upgrade is not tested here — that requires a running Kestrel server.
/// </summary>
public abstract class NotificationHubTests : MobileApiIntegrationTestBase
{
    protected NotificationHubTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected HttpClient CreateClient() =>
        CreateClientWithAuth(services =>
        {
            // INotificationBroadcaster must be registered; use a no-op for hub auth tests
            services.AddScoped<INotificationBroadcaster>(_ => Mock.Of<INotificationBroadcaster>());
        });

    // ─── Negotiate endpoint ──────────────────────────────────────────────────

    public sealed class Negotiate_WhenAuthenticated : NotificationHubTests
    {
        public Negotiate_WhenAuthenticated(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Post_ToNegotiate_Returns200()
        {
            var client = CreateClient();

            var response = await client.PostAsync(
                "/hubs/notifications/negotiate?negotiateVersion=1",
                null
            );

            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    public sealed class Negotiate_WhenUnauthenticated : NotificationHubTests
    {
        public Negotiate_WhenUnauthenticated(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Post_ToNegotiate_WithoutAuth_Returns401()
        {
            // Create a client with no auth handler — the MultiAuth policy scheme receives no
            // Authorization header and no access_token query param, so it returns NoResult → 401.
            var factory = Factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    services.AddScoped<INotificationBroadcaster>(_ =>
                        Mock.Of<INotificationBroadcaster>()
                    );
                    // Replace claims transformation with no-op to avoid DB calls
                    services.AddScoped<IClaimsTransformation>(_ => new NoOpTransformation());
                });
            });
            var client = factory.CreateClient();

            var response = await client.PostAsync(
                "/hubs/notifications/negotiate?negotiateVersion=1",
                null
            );

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        private sealed class NoOpTransformation : IClaimsTransformation
        {
            public Task<System.Security.Claims.ClaimsPrincipal> TransformAsync(
                System.Security.Claims.ClaimsPrincipal principal
            ) => Task.FromResult(principal);
        }
    }
}
