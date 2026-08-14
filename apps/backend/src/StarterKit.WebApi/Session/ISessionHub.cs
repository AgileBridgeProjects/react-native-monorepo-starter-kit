namespace StarterKit.WebApi.Session;

/// <summary>
/// Server-to-client SignalR contract for session lifecycle events.
/// </summary>
public interface ISessionHub
{
    /// <summary>Sent when the idle timeout is approaching. Client should show the warning modal.</summary>
    Task ReceiveSessionWarningAsync(
        int remainingSeconds,
        CancellationToken cancellationToken = default
    );

    /// <summary>Sent when the session has expired. Client must sign out immediately.</summary>
    Task ReceiveSessionExpiredAsync(string reason, CancellationToken cancellationToken = default);
}
