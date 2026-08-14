namespace StarterKit.Core.Notifications.Interfaces;

/// <summary>
/// Abstraction used by <see cref="StarterKit.Core.Notifications.Services.CommunicationsJobProcessor"/>
/// to push notification message status changes to connected admin portal clients.
/// The transport implementation lives in <c>StarterKit.WebApi</c> so Core stays transport-agnostic.
/// </summary>
public interface INotificationMessageBroadcaster
{
    Task BroadcastStatusChangedAsync(
        Guid notificationMessageId,
        Guid clubId,
        string status,
        CancellationToken cancellationToken = default
    );
}
