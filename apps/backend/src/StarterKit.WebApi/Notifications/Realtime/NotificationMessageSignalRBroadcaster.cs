using Microsoft.AspNetCore.SignalR;
using StarterKit.Core.Notifications.Interfaces;
using StarterKit.WebApi.Realtime;

namespace StarterKit.WebApi.Notifications.Realtime;

/// <summary>
/// Delivers notification message status changes to all connected admin portal clients
/// via <see cref="AdminRealtimeHub"/>. The frontend filters by <c>clubId</c> so
/// only admins viewing the relevant club's communications page reload their grid.
/// </summary>
internal sealed class NotificationMessageSignalRBroadcaster(
    IHubContext<AdminRealtimeHub, IAdminRealtimeHub> hubContext
) : INotificationMessageBroadcaster
{
    public Task BroadcastStatusChangedAsync(
        Guid notificationMessageId,
        Guid clubId,
        string status,
        CancellationToken cancellationToken = default
    ) =>
        hubContext.Clients.All.ReceiveNotificationMessageStatusChangedAsync(
            notificationMessageId,
            clubId,
            status,
            cancellationToken
        );
}
