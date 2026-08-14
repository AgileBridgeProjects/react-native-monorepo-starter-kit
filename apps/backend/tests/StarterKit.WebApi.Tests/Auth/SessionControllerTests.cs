using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using StarterKit.Core.Interfaces;
using StarterKit.Core.Interfaces.Services;
using StarterKit.WebApi.Tests.Infrastructure;

namespace StarterKit.WebApi.Tests.Auth;

public abstract class SessionControllerTests : WebApiIntegrationTestBase
{
    protected SessionControllerTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected HttpClient CreateClient(
        Mock<IAuthClaimsService> claimsServiceMock,
        Mock<ICurrentSession>? sessionMock = null
    )
    {
        return CreateClientWithAuth(services =>
        {
            services.AddScoped<IAuthClaimsService>(_ => claimsServiceMock.Object);

            if (sessionMock is not null)
                services.AddScoped<ICurrentSession>(_ => sessionMock.Object);
        });
    }

    // ── POST /api/auth/revoke-sessions ───────────────────────────────────

    public sealed class RevokeSessions_Returns204 : SessionControllerTests
    {
        public RevokeSessions_Returns204(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task RevokeSessions_WhenAuthenticated_RevokesTokensAndReturns204()
        {
            var firebaseUid = "firebase-test-uid";
            var claimsServiceMock = new Mock<IAuthClaimsService>();
            claimsServiceMock
                .Setup(s => s.RevokeRefreshTokensAsync(firebaseUid, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            var sessionMock = new Mock<ICurrentSession>();
            sessionMock.Setup(s => s.FirebaseUid).Returns(firebaseUid);
            sessionMock.Setup(s => s.UserIdOrDefault).Returns(Guid.NewGuid());

            var client = CreateClient(claimsServiceMock, sessionMock);

            var response = await client.PostAsync("/api/auth/revoke-sessions", null);

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
            claimsServiceMock.Verify(
                s => s.RevokeRefreshTokensAsync(firebaseUid, It.IsAny<CancellationToken>()),
                Times.Once
            );
        }
    }

    public sealed class RevokeSessions_Returns401_WhenNoFirebaseUid : SessionControllerTests
    {
        public RevokeSessions_Returns401_WhenNoFirebaseUid(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task RevokeSessions_WhenFirebaseUidMissing_Returns401()
        {
            var claimsServiceMock = new Mock<IAuthClaimsService>();

            var sessionMock = new Mock<ICurrentSession>();
            sessionMock.Setup(s => s.FirebaseUid).Returns((string?)null);

            var client = CreateClient(claimsServiceMock, sessionMock);

            var response = await client.PostAsync("/api/auth/revoke-sessions", null);

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
            claimsServiceMock.Verify(
                s => s.RevokeRefreshTokensAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
                Times.Never
            );
        }
    }
}
