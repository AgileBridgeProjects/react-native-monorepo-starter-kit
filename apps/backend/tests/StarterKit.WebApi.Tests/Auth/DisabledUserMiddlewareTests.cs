using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using StarterKit.Core.Interfaces;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Models;
using StarterKit.Data.Clubs.Models;
using StarterKit.WebApi.Auth.DTOs;
using StarterKit.WebApi.Tests.Infrastructure;

namespace StarterKit.WebApi.Tests.Auth;

/// <summary>
/// Integration tests for <c>DisabledUserMiddleware</c> which rejects authenticated requests
/// that carry no <c>internal_user_id</c> claim (i.e. disabled or unregistered users).
/// </summary>
public abstract class DisabledUserMiddlewareTests : WebApiIntegrationTestBase
{
    protected DisabledUserMiddlewareTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    private static Mock<IClubService> CreateClubServiceMock()
    {
        var clubServiceMock = new Mock<IClubService>();
        clubServiceMock
            .Setup(s => s.FindByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Club?)null);
        return clubServiceMock;
    }

    // ── Authenticated + internal_user_id present ─────────────────────────────

    public sealed class EnabledUser_CanReachEndpoint : DisabledUserMiddlewareTests
    {
        public EnabledUser_CanReachEndpoint(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns200_WhenAuthenticatedWithInternalUserIdClaim()
        {
            var userId = Guid.NewGuid();
            var userServiceMock = new Mock<IUserService>();
            userServiceMock
                .Setup(s => s.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new User { Id = userId, IsActive = true });
            userServiceMock
                .Setup(s => s.GetUserPermissionsAsync(userId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new HashSet<string>() as IReadOnlySet<string>);

            var client = CreateClientWithAuth(services =>
            {
                services.AddScoped<IUserService>(_ => userServiceMock.Object);
                services.AddScoped<IClubService>(_ => CreateClubServiceMock().Object);
            });
            client.DefaultRequestHeaders.Add(TestAuthHandler.UserIdHeader, userId.ToString());

            var response = await client.GetAsync("/api/auth/me");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<MeResponse>(JsonOptions);
            body.Should().NotBeNull();
            body!.IsActive.Should().BeTrue();
            userServiceMock.Verify(
                s => s.GetByIdAsync(userId, It.IsAny<CancellationToken>()),
                Times.Once
            );
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
            var userServiceMock = new Mock<IUserService>();

            var client = CreateClientWithAuth(services =>
            {
                services.AddScoped<IUserService>(_ => userServiceMock.Object);
                services.AddScoped<IClubService>(_ => CreateClubServiceMock().Object);
            });
            client.DefaultRequestHeaders.Add(TestAuthHandler.NoInternalUserIdHeader, "true");

            var response = await client.GetAsync("/api/auth/me");

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
            var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
            problem.Should().NotBeNull();
            problem!.Title.Should().Be("Access Denied");
            problem.Status.Should().Be(StatusCodes.Status403Forbidden);
        }

        [Fact]
        public async Task NeverReachesController_WhenDisabledUserIsMakingRequest()
        {
            var userServiceMock = new Mock<IUserService>();

            var client = CreateClientWithAuth(services =>
            {
                services.AddScoped<IUserService>(_ => userServiceMock.Object);
                services.AddScoped<IClubService>(_ => CreateClubServiceMock().Object);
            });
            client.DefaultRequestHeaders.Add(TestAuthHandler.NoInternalUserIdHeader, "true");

            await client.GetAsync("/api/auth/me");

            // Middleware must short-circuit before the controller touches the service.
            userServiceMock.Verify(
                s => s.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
                Times.Never
            );
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
            // Use a raw client with no auth scheme — real authentication middleware
            // will reject the request before DisabledUserMiddleware runs.
            var client = Factory
                .WithWebHostBuilder(builder =>
                {
                    builder.UseSetting("ASPNETCORE_ENVIRONMENT", "Testing");
                    builder.UseSetting(
                        "ConnectionStrings:DefaultConnection",
                        "Server=.;Database=StarterKit_Test;TrustServerCertificate=True"
                    );
                    builder.UseSetting("Firebase:Enabled", "false");
                    builder.UseSetting("KeyVault:Name", "");
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
