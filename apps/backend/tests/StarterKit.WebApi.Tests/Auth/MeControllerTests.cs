using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
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

public abstract class MeControllerTests : WebApiIntegrationTestBase
{
    protected MeControllerTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected HttpClient CreateClient(
        Mock<IUserService> userServiceMock,
        Guid? userId = null,
        Club? club = null
    )
    {
        var clubServiceMock = new Mock<IClubService>();
        clubServiceMock
            .Setup(s => s.FindByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(club);

        // Default GetUserPermissionsAsync to empty set so MeController's spread operator
        // doesn't receive null from an un-configured mock.
        userServiceMock
            .Setup(s => s.GetUserPermissionsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new HashSet<string>() as IReadOnlySet<string>);

        var client = CreateClientWithAuth(services =>
        {
            services.AddScoped<IUserService>(_ => userServiceMock.Object);
            services.AddScoped<IClubService>(_ => clubServiceMock.Object);
        });

        if (userId is not null)
            client.DefaultRequestHeaders.Add(TestAuthHandler.UserIdHeader, userId.Value.ToString());

        return client;
    }

    // ── GET /api/auth/me ─────────────────────────────────────────────────

    public sealed class Me_ReturnsActiveFirebaseUser : MeControllerTests
    {
        public Me_ReturnsActiveFirebaseUser(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns200_WithIsActiveTrue_ForFirebaseUser()
        {
            var userId = Guid.NewGuid();
            var userServiceMock = new Mock<IUserService>();
            userServiceMock
                .Setup(s => s.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new User { Id = userId, IsActive = true });

            var client = CreateClient(userServiceMock, userId: userId);

            var response = await client.GetAsync("/api/auth/me");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<MeResponse>(JsonOptions);
            body!.IsActive.Should().BeTrue();
        }
    }

    public sealed class Me_ReturnsSuspendedFirebaseUser : MeControllerTests
    {
        public Me_ReturnsSuspendedFirebaseUser(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns200_WithIsActiveFalse_ForSuspendedUser()
        {
            var userId = Guid.NewGuid();
            var userServiceMock = new Mock<IUserService>();
            userServiceMock
                .Setup(s => s.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new User { Id = userId, IsActive = false });

            var client = CreateClient(userServiceMock, userId: userId);

            var response = await client.GetAsync("/api/auth/me");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<MeResponse>(JsonOptions);
            body!.IsActive.Should().BeFalse();
        }
    }

    public sealed class Me_Returns403_WhenNoInternalUserIdClaim : MeControllerTests
    {
        public Me_Returns403_WhenNoInternalUserIdClaim(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns403_WhenAuthenticatedButInternalUserIdClaimAbsent()
        {
            var userServiceMock = new Mock<IUserService>();

            // Simulate a disabled/unregistered user: authenticated via Firebase but no
            // internal_user_id claim (as the RoleClaimsTransformer would produce).
            // DisabledUserMiddleware must short-circuit before the controller runs.
            var client = CreateClient(userServiceMock);
            client.DefaultRequestHeaders.Add(TestAuthHandler.NoInternalUserIdHeader, "true");

            var response = await client.GetAsync("/api/auth/me");

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
            userServiceMock.Verify(
                s => s.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
                Times.Never
            );
        }
    }

    public sealed class Me_ReturnsActiveMicrosoftEntraUser : MeControllerTests
    {
        public Me_ReturnsActiveMicrosoftEntraUser(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns200_WithIsActiveTrue_ForMicrosoftEntraUser()
        {
            var userId = Guid.NewGuid();
            var userServiceMock = new Mock<IUserService>();
            userServiceMock
                .Setup(s => s.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new User { Id = userId, IsActive = true });

            var client = CreateClient(userServiceMock, userId: userId);

            var response = await client.GetAsync("/api/auth/me");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<MeResponse>(JsonOptions);
            body!.IsActive.Should().BeTrue();
            userServiceMock.Verify(
                s => s.GetByIdAsync(userId, It.IsAny<CancellationToken>()),
                Times.Once
            );
        }
    }

    public sealed class Me_ReturnsClubDetails : MeControllerTests
    {
        public Me_ReturnsClubDetails(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns200_WithClubNameAndLogoUrl_ForClubUser()
        {
            var userId = Guid.NewGuid();
            var userServiceMock = new Mock<IUserService>();
            userServiceMock
                .Setup(s => s.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new User { Id = userId, IsActive = true });
            var club = new Club
            {
                Id = TestClubId,
                Name = "Acme Corp",
                LogoUrl = "https://cdn.example.com/logo.png",
            };

            var client = CreateClient(userServiceMock, userId: userId, club: club);

            var response = await client.GetAsync("/api/auth/me");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<MeResponse>(JsonOptions);
            body!.ClubName.Should().Be("Acme Corp");
            body.ClubLogoUrl.Should().Be("https://cdn.example.com/logo.png");
        }
    }

    public sealed class Me_UserIdTakesPrecedenceOverExternalAuth : MeControllerTests
    {
        public Me_UserIdTakesPrecedenceOverExternalAuth(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task UsesInternalUserId_Regardless_OfExternalAuthClaims()
        {
            var userId = Guid.NewGuid();
            var userServiceMock = new Mock<IUserService>();
            userServiceMock
                .Setup(s => s.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new User { Id = userId, IsActive = true });

            var client = CreateClient(userServiceMock, userId: userId);
            // Also add Firebase & MS headers — they should be irrelevant
            client.DefaultRequestHeaders.Add(TestAuthHandler.FirebaseUidHeader, "firebase-uid-789");
            client.DefaultRequestHeaders.Add(
                TestAuthHandler.MsOidHeader,
                Guid.NewGuid().ToString()
            );

            var response = await client.GetAsync("/api/auth/me");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            userServiceMock.Verify(
                s => s.GetByIdAsync(userId, It.IsAny<CancellationToken>()),
                Times.Once
            );
        }
    }
}
