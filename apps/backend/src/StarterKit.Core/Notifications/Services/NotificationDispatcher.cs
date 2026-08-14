using Microsoft.Extensions.Logging;
using StarterKit.Core.Notifications.DTOs;
using StarterKit.Core.Notifications.Enums;
using StarterKit.Core.Notifications.Interfaces.Services;

namespace StarterKit.Core.Notifications.Services;

public sealed class NotificationDispatcher(
    IEmailSender emailSender,
    ISmsSender smsSender,
    ILogger<NotificationDispatcher> logger
) : INotificationDispatcher
{
    public async Task SendAsync(
        Notification notification,
        NotificationRecipient recipient,
        NotificationChannel? channels = null,
        CancellationToken cancellationToken = default
    )
    {
        var requestedChannels = channels ?? notification.SupportedChannels;
        var effectiveChannels = notification.SupportedChannels & requestedChannels;
        var notificationType = notification.GetType().Name;

        if (effectiveChannels == NotificationChannel.None)
        {
            logger.LogDebug(
                "No effective channels for {NotificationType} — Channel: {Channel}, Supported: {Supported}, Requested: {Requested}",
                notificationType,
                NotificationChannel.None,
                notification.SupportedChannels,
                requestedChannels
            );
            return;
        }

        if (effectiveChannels.HasFlag(NotificationChannel.Email))
        {
            if (recipient.Email is not null)
            {
                var payload = notification.BuildEmail();
                if (payload is not null)
                {
                    logger.LogInformation(
                        "Dispatching {NotificationType} via {Channel}",
                        notificationType,
                        NotificationChannel.Email
                    );
                    await emailSender.SendAsync(payload, recipient.Email, cancellationToken);
                }
                else
                {
                    logger.LogWarning(
                        "{NotificationType} declares Email support but BuildEmail() returned null — skipping",
                        notificationType
                    );
                }
            }
            else
            {
                logger.LogDebug(
                    "Skipping {Channel} for {NotificationType} — recipient has no email address",
                    NotificationChannel.Email,
                    notificationType
                );
            }
        }

        if (effectiveChannels.HasFlag(NotificationChannel.Sms))
        {
            if (recipient.PhoneNumber is not null)
            {
                var payload = notification.BuildSms();
                if (payload is not null)
                {
                    logger.LogInformation(
                        "Dispatching {NotificationType} via {Channel}",
                        notificationType,
                        NotificationChannel.Sms
                    );
                    await smsSender.SendAsync(payload, recipient.PhoneNumber, cancellationToken);
                }
                else
                {
                    logger.LogWarning(
                        "{NotificationType} declares SMS support but BuildSms() returned null — skipping",
                        notificationType
                    );
                }
            }
            else
            {
                logger.LogDebug(
                    "Skipping {Channel} for {NotificationType} — recipient has no phone number",
                    NotificationChannel.Sms,
                    notificationType
                );
            }
        }
    }
}
