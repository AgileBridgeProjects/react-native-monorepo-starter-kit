using StarterKit.Data.PushNotifications.Enums;

namespace StarterKit.Core.PushNotifications.Interfaces;

/// <summary>
/// Broadcasts a real-time "new notification" signal to all active connections
/// for a given user. Abstracted so <c>StarterKit.Core</c> stays independent of
/// the SignalR transport layer that lives in <c>StarterKit.MobileApi</c>.
/// </summary>
public interface INotificationBroadcaster
{
    Task BroadcastAsync(
        Guid userId,
        PushNotificationType notificationType,
        CancellationToken ct = default
    );

    /// <summary>
    /// Signals the user's active connections that a conversation changed (new message or a
    /// read-state change on another device) so clients refresh the Messages list and any open
    /// conversation in real time.
    /// </summary>
    Task BroadcastMessageAsync(Guid userId, Guid conversationId, CancellationToken ct = default);
}
