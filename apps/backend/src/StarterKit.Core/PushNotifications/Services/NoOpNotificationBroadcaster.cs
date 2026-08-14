using StarterKit.Core.PushNotifications.Interfaces;
using StarterKit.Data.PushNotifications.Enums;

namespace StarterKit.Core.PushNotifications.Services;

/// <summary>
/// No-op broadcaster used when no real-time transport is registered (e.g. WebApi).
/// <c>StarterKit.MobileApi</c> overrides this with <c>SignalRNotificationBroadcaster</c>.
/// </summary>
internal sealed class NoOpNotificationBroadcaster : INotificationBroadcaster
{
    public Task BroadcastAsync(
        Guid userId,
        PushNotificationType notificationType,
        CancellationToken ct = default
    ) => Task.CompletedTask;

    public Task BroadcastMessageAsync(
        Guid userId,
        Guid conversationId,
        CancellationToken ct = default
    ) => Task.CompletedTask;
}
