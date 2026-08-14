using StarterKit.Core.Notifications.DTOs;
using StarterKit.Core.Notifications.Enums;

namespace StarterKit.Core.Notifications.Interfaces.Services;

public interface INotificationDispatcher
{
    /// <summary>
    /// Send <paramref name="notification"/> to <paramref name="recipient"/>.
    ///
    /// <paramref name="channels"/> narrows which channels fire at call-site. Only channels
    /// that are both requested AND declared in <see cref="Notification.SupportedChannels"/>
    /// are used. Omit to use all supported channels.
    /// </summary>
    Task SendAsync(
        Notification notification,
        NotificationRecipient recipient,
        NotificationChannel? channels = null,
        CancellationToken cancellationToken = default
    );
}
