using FluentAssertions;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;
using Moq;
using StarterKit.WebApi.Session;

namespace StarterKit.WebApi.Tests.Session;

/// <summary>
/// Unit tests for <see cref="SessionHub"/>.
///
/// Tests that involve <c>OnConnectedAsync</c> or <c>OnDisconnectedAsync</c> require the
/// SignalR hub pipeline (base class lifecycle) and are covered by integration tests instead.
/// These tests exercise the hub methods that can be invoked directly without the pipeline.
/// </summary>
public abstract class SessionHubTests
{
    private readonly Mock<ISessionTracker> _trackerMock = new();
    private readonly SessionTimeoutOptions _opts = new()
    {
        IdleTimeoutMinutes = 30,
        AbsoluteTimeoutHours = 8,
        WarningMinutes = 5,
    };

    protected readonly SessionHub Sut;
    protected readonly Mock<HubCallerContext> ContextMock = new();

    protected SessionHubTests()
    {
        Sut = new SessionHub(_trackerMock.Object, Options.Create(_opts), TimeProvider.System);
        Sut.Context = ContextMock.Object;
    }

    // ── ExtendSessionAsync ────────────────────────────────────────────────────

    public sealed class ExtendSessionAsync_WhenUserIdentifierPresent : SessionHubTests
    {
        [Fact]
        public async Task ExtendSessionAsync_CallsRecordActivity_WithUserId()
        {
            ContextMock.Setup(c => c.UserIdentifier).Returns("user-123");

            await Sut.ExtendSessionAsync();

            _trackerMock.Verify(t => t.RecordActivity("user-123"), Times.Once);
        }
    }

    public sealed class ExtendSessionAsync_WhenUserIdentifierMissing : SessionHubTests
    {
        [Fact]
        public async Task ExtendSessionAsync_WhenNoUserIdentifier_DoesNotCallRecordActivity()
        {
            ContextMock.Setup(c => c.UserIdentifier).Returns((string?)null);

            await Sut.ExtendSessionAsync();

            _trackerMock.Verify(t => t.RecordActivity(It.IsAny<string>()), Times.Never);
        }
    }
}
