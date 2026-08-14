namespace StarterKit.WebApi.Session;

/// <summary>
/// Tracks active user sessions across SignalR connections.
/// Keyed by internal user ID so multiple tabs share a single session state.
///
/// Session state is NEVER deleted when connections drop — it persists until
/// the session is explicitly expired or the user signs out. This ensures that
/// idle time accumulated while a browser tab is backgrounded (and the WebSocket
/// has dropped) is not lost on reconnect.
/// </summary>
public interface ISessionTracker
{
    /// <summary>
    /// Registers a new SignalR connection for a user.
    /// Creates a new session state only if none exists; otherwise adds the
    /// connection to the existing state WITHOUT resetting idle tracking.
    /// </summary>
    void RegisterConnection(string userId, string connectionId);

    /// <summary>
    /// Removes a SignalR connection for a user.
    /// Does NOT delete the session state — idle time is preserved across reconnects.
    /// </summary>
    void UnregisterConnection(string userId, string connectionId);

    /// <summary>Resets the idle timer for a user (called on API mutation or explicit session extend).</summary>
    void RecordActivity(string userId);

    /// <summary>Returns the session state for a user, or null if no session exists.</summary>
    UserSessionState? GetSession(string userId);

    /// <summary>
    /// Permanently removes the session for a user.
    /// Called by the monitor after expiry events are sent, and by the sign-out path.
    /// </summary>
    void RemoveSession(string userId);

    IReadOnlyList<UserSessionState> GetAllSessions();
}

public sealed class UserSessionState
{
    private readonly HashSet<string> _connectionIds = [];
    private readonly object _connectionLock = new();

    public required string UserId { get; init; }

    /// <summary>When the first connection for this user was established in this server session.</summary>
    public required DateTime SessionStartedAt { get; init; }

    /// <summary>Last time any activity was recorded for this user.</summary>
    public DateTime LastActivityAt { get; set; }

    /// <summary>True once a warning has been sent — prevents duplicate warnings per idle cycle.</summary>
    public bool WarningSent { get; set; }

    /// <summary>
    /// When the warning was first issued for the current idle cycle.
    /// Set alongside WarningSent. Used to compute remaining time accurately
    /// on SignalR reconnects without re-extending the session deadline.
    /// Cleared by RecordActivity when the user extends their session.
    /// </summary>
    public DateTime? WarningStartedAt { get; set; }

    public bool AddConnection(string connectionId)
    {
        lock (_connectionLock)
            return _connectionIds.Add(connectionId);
    }

    public bool RemoveConnection(string connectionId)
    {
        lock (_connectionLock)
            return _connectionIds.Remove(connectionId);
    }

    /// <summary>True when at least one SignalR tab is connected and can receive push events.</summary>
    public bool HasActiveConnections
    {
        get
        {
            lock (_connectionLock)
                return _connectionIds.Count > 0;
        }
    }
}
