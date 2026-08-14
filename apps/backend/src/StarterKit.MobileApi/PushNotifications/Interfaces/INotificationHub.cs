namespace StarterKit.MobileApi.PushNotifications.Interfaces;

/// <summary>
/// Client-side contract for <see cref="NotificationHub"/>.
/// Defines the methods the server can invoke on connected Expo clients.
/// </summary>
public interface INotificationHub
{
    /// <summary>
    /// Signals that a new notification of <paramref name="notificationType"/> has been created
    /// for this user. The client uses the type to invalidate the relevant React Query caches.
    /// </summary>
    Task ReceiveNotification(string notificationType, CancellationToken ct = default);

    /// <summary>
    /// Signals that <paramref name="conversationId"/> changed for this user — a new message
    /// arrived or read-state moved on another device. The client refetches
    /// the Messages list and, when open, that conversation.
    /// </summary>
    Task ReceiveMessage(string conversationId, CancellationToken ct = default);
}
