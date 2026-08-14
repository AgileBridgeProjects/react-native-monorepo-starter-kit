using System.Collections.Concurrent;
using StarterKit.Data.Extensions;

namespace StarterKit.WebApi.Session;

/// <summary>
/// Thread-safe in-memory session tracker. Singleton lifetime.
/// Each user has one <see cref="UserSessionState"/> shared across all their tabs.
/// </summary>
public sealed class SessionTracker(TimeProvider clock) : ISessionTracker
{
    private readonly ConcurrentDictionary<string, UserSessionState> _sessions = new();

    public void RegisterConnection(string userId, string connectionId)
    {
        _sessions.AddOrUpdate(
            userId,
            // No session exists — create one fresh.
            _ =>
            {
                var now = clock.Now();
                var state = new UserSessionState
                {
                    UserId = userId,
                    SessionStartedAt = now,
                    LastActivityAt = now,
                };
                state.AddConnection(connectionId);
                return state;
            },
            // Session already exists (reconnect after tab backgrounded, page refresh, etc.).
            // Crucially: do NOT reset LastActivityAt or WarningSent — the existing idle
            // tracking must be preserved so 28 minutes of inactivity is not forgotten
            // just because the WebSocket reconnected.
            (_, existing) =>
            {
                existing.AddConnection(connectionId);
                return existing;
            }
        );
    }

    public void UnregisterConnection(string userId, string connectionId)
    {
        if (!_sessions.TryGetValue(userId, out var state))
            return;

        // Remove the connection ID but KEEP the session state alive.
        // The monitor will expire it based on time — not on connection presence.
        state.RemoveConnection(connectionId);
    }

    public void RecordActivity(string userId)
    {
        if (_sessions.TryGetValue(userId, out var state))
        {
            state.LastActivityAt = clock.Now();
            state.WarningSent = false;
            state.WarningStartedAt = null;
        }
    }

    public UserSessionState? GetSession(string userId) =>
        _sessions.TryGetValue(userId, out var state) ? state : null;

    public void RemoveSession(string userId) => _sessions.TryRemove(userId, out _);

    public IReadOnlyList<UserSessionState> GetAllSessions() => [.. _sessions.Values];
}
