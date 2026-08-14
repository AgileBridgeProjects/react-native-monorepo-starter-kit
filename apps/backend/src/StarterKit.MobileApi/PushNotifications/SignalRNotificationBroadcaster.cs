using Microsoft.AspNetCore.SignalR;
using StarterKit.Core.PushNotifications.Interfaces;
using StarterKit.Data.PushNotifications.Enums;
using StarterKit.MobileApi.PushNotifications.Interfaces;

namespace StarterKit.MobileApi.PushNotifications;

/// <summary>
/// <see cref="INotificationBroadcaster"/> implementation that delivers the signal over SignalR.
/// Lives in <c>StarterKit.MobileApi</c> so that <c>StarterKit.Core</c> stays transport-agnostic.
/// </summary>
internal sealed class SignalRNotificationBroadcaster(
    IHubContext<NotificationHub, INotificationHub> hubContext
) : INotificationBroadcaster
{
    public Task BroadcastAsync(
        Guid userId,
        PushNotificationType notificationType,
        CancellationToken ct = default
    ) =>
        hubContext
            .Clients.User(userId.ToString())
            .ReceiveNotification(notificationType.ToString(), ct);

    public Task BroadcastMessageAsync(
        Guid userId,
        Guid conversationId,
        CancellationToken ct = default
    ) => hubContext.Clients.User(userId.ToString()).ReceiveMessage(conversationId.ToString(), ct);
}
