using StarterKit.Core.Notifications.Interfaces;

namespace StarterKit.Core.Notifications.Services;

/// <summary>
/// Default no-op implementation registered by <c>AddStarterKitNotifications</c>.
/// <c>StarterKit.WebApi</c> overrides this with <c>NotificationMessageSignalRBroadcaster</c>.
/// </summary>
internal sealed class NoOpNotificationMessageBroadcaster : INotificationMessageBroadcaster
{
    public Task BroadcastStatusChangedAsync(
        Guid notificationMessageId,
        Guid clubId,
        string status,
        CancellationToken cancellationToken = default
    ) => Task.CompletedTask;
}
