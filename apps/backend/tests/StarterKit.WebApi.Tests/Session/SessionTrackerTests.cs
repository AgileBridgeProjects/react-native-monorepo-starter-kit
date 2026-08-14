using FluentAssertions;
using StarterKit.WebApi.Session;

namespace StarterKit.WebApi.Tests.Session;

/// <summary>
/// Unit tests for <see cref="SessionTracker"/>.
/// Uses a fake <see cref="TimeProvider"/> so time-sensitive assertions are deterministic.
/// </summary>
public abstract class SessionTrackerTests
{
    private readonly FakeTimeProvider _clock = new(
        new DateTimeOffset(2025, 1, 1, 12, 0, 0, TimeSpan.Zero)
    );
    protected readonly SessionTracker Sut;

    protected SessionTrackerTests()
    {
        Sut = new SessionTracker(_clock);
    }

    private sealed class FakeTimeProvider(DateTimeOffset initial) : TimeProvider
    {
        private DateTimeOffset _now = initial;

        public override DateTimeOffset GetUtcNow() => _now;

        public void Advance(TimeSpan by) => _now = _now.Add(by);
    }

    // ── RegisterConnection ────────────────────────────────────────────────────

    public sealed class RegisterConnection_CreatesNewSession : SessionTrackerTests
    {
        [Fact]
        public void RegisterConnection_WhenNoPriorSession_CreatesSessionWithTimestamps()
        {
            Sut.RegisterConnection("user-1", "conn-1");

            var session = Sut.GetSession("user-1");
            session.Should().NotBeNull();
            session!.UserId.Should().Be("user-1");
            session.SessionStartedAt.Should().Be(_clock.GetUtcNow().UtcDateTime);
            session.LastActivityAt.Should().Be(_clock.GetUtcNow().UtcDateTime);
        }

        [Fact]
        public void RegisterConnection_WhenNoPriorSession_SessionHasActiveConnection()
        {
            Sut.RegisterConnection("user-1", "conn-1");

            Sut.GetSession("user-1")!.HasActiveConnections.Should().BeTrue();
        }
    }

    public sealed class RegisterConnection_PreservesIdleTimeOnReconnect : SessionTrackerTests
    {
        [Fact]
        public void RegisterConnection_WhenSessionExists_DoesNotResetLastActivityAt()
        {
            Sut.RegisterConnection("user-1", "conn-1");
            var initialActivity = _clock.GetUtcNow().UtcDateTime;

            // Simulate 10 minutes of idle time.
            _clock.Advance(TimeSpan.FromMinutes(10));

            // Second connection (e.g. a new tab opening or WebSocket reconnect).
            Sut.RegisterConnection("user-1", "conn-2");

            var session = Sut.GetSession("user-1");
            session!.LastActivityAt.Should().Be(initialActivity);
        }

        [Fact]
        public void RegisterConnection_WhenSessionExists_DoesNotResetWarningSent()
        {
            Sut.RegisterConnection("user-1", "conn-1");
            var session = Sut.GetSession("user-1")!;
            session.WarningSent = true;

            Sut.RegisterConnection("user-1", "conn-2");

            Sut.GetSession("user-1")!.WarningSent.Should().BeTrue();
        }
    }

    // ── UnregisterConnection ──────────────────────────────────────────────────

    public sealed class UnregisterConnection_KeepsSession : SessionTrackerTests
    {
        [Fact]
        public void UnregisterConnection_RemovesConnectionButKeepsSessionState()
        {
            Sut.RegisterConnection("user-1", "conn-1");

            Sut.UnregisterConnection("user-1", "conn-1");

            // Session persists — idle time is still tracked.
            Sut.GetSession("user-1").Should().NotBeNull();
        }

        [Fact]
        public void UnregisterConnection_WhenAllConnectionsRemoved_SessionHasNoActiveConnections()
        {
            Sut.RegisterConnection("user-1", "conn-1");
            Sut.RegisterConnection("user-1", "conn-2");

            Sut.UnregisterConnection("user-1", "conn-1");
            Sut.UnregisterConnection("user-1", "conn-2");

            Sut.GetSession("user-1")!.HasActiveConnections.Should().BeFalse();
        }

        [Fact]
        public void UnregisterConnection_ForUnknownUser_DoesNotThrow()
        {
            var act = () => Sut.UnregisterConnection("unknown", "conn-1");

            act.Should().NotThrow();
        }
    }

    // ── RecordActivity ────────────────────────────────────────────────────────

    public sealed class RecordActivity_ResetsIdleTracking : SessionTrackerTests
    {
        [Fact]
        public void RecordActivity_UpdatesLastActivityAt()
        {
            Sut.RegisterConnection("user-1", "conn-1");
            _clock.Advance(TimeSpan.FromMinutes(5));

            Sut.RecordActivity("user-1");

            Sut.GetSession("user-1")!.LastActivityAt.Should().Be(_clock.GetUtcNow().UtcDateTime);
        }

        [Fact]
        public void RecordActivity_ResetsWarningSentToFalse()
        {
            Sut.RegisterConnection("user-1", "conn-1");
            var session = Sut.GetSession("user-1")!;
            session.WarningSent = true;
            session.WarningStartedAt = _clock.GetUtcNow().UtcDateTime;

            Sut.RecordActivity("user-1");

            session.WarningSent.Should().BeFalse();
            session.WarningStartedAt.Should().BeNull();
        }

        [Fact]
        public void RecordActivity_ForUnknownUser_DoesNotThrow()
        {
            var act = () => Sut.RecordActivity("unknown");

            act.Should().NotThrow();
        }
    }

    // ── RemoveSession ─────────────────────────────────────────────────────────

    public sealed class RemoveSession_DeletesEntry : SessionTrackerTests
    {
        [Fact]
        public void RemoveSession_WhenSessionExists_RemovesIt()
        {
            Sut.RegisterConnection("user-1", "conn-1");

            Sut.RemoveSession("user-1");

            Sut.GetSession("user-1").Should().BeNull();
        }

        [Fact]
        public void RemoveSession_ForUnknownUser_DoesNotThrow()
        {
            var act = () => Sut.RemoveSession("unknown");

            act.Should().NotThrow();
        }
    }

    // ── GetSession ────────────────────────────────────────────────────────────

    public sealed class GetSession_ForUnknownUser : SessionTrackerTests
    {
        [Fact]
        public void GetSession_WhenNoSessionExists_ReturnsNull()
        {
            Sut.GetSession("user-nobody").Should().BeNull();
        }
    }

    // ── GetAllSessions ────────────────────────────────────────────────────────

    public sealed class GetAllSessions_ReturnsAll : SessionTrackerTests
    {
        [Fact]
        public void GetAllSessions_WhenMultipleUsersRegistered_ReturnsAllSessions()
        {
            Sut.RegisterConnection("user-1", "conn-1");
            Sut.RegisterConnection("user-2", "conn-2");

            var sessions = Sut.GetAllSessions();

            sessions.Should().HaveCount(2);
            sessions.Select(s => s.UserId).Should().BeEquivalentTo(["user-1", "user-2"]);
        }

        [Fact]
        public void GetAllSessions_WhenOneSessionRemoved_DoesNotIncludeIt()
        {
            Sut.RegisterConnection("user-1", "conn-1");
            Sut.RegisterConnection("user-2", "conn-2");
            Sut.RemoveSession("user-1");

            var sessions = Sut.GetAllSessions();

            sessions.Should().HaveCount(1);
            sessions[0].UserId.Should().Be("user-2");
        }
    }
}
