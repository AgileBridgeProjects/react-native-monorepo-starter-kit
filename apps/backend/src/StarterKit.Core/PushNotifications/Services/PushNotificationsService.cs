using Microsoft.Extensions.Logging;
using StarterKit.Core.PushNotifications.Interfaces;
using StarterKit.Data.DeviceTokens.Enums;
using StarterKit.Data.DeviceTokens.Interfaces.Repositories;
using StarterKit.Data.Extensions;
using StarterKit.Data.PushNotifications.Enums;
using StarterKit.Data.PushNotifications.Interfaces.Repositories;
using StarterKit.Data.PushNotifications.Models;

namespace StarterKit.Core.PushNotifications.Services;

internal sealed class PushNotificationsService(
    IPushNotificationRepository repository,
    IDeviceTokenRepository deviceTokenRepository,
    IEnumerable<IPushSender> pushSenders,
    INotificationBroadcaster broadcaster,
    TimeProvider clock,
    ILogger<PushNotificationsService> logger
) : IPushNotificationsService
{
    private readonly Dictionary<PushPlatform, IPushSender> _senderMap = pushSenders.ToDictionary(
        s => s.Platform
    );

    public async Task<Guid> CreateAsync(
        Guid userId,
        PushNotificationType type,
        string title,
        string body,
        string? mediaUrl = null,
        CancellationToken ct = default
    )
    {
        var notification = new PushNotification
        {
            UserId = userId,
            NotificationType = type,
            Title = title,
            Body = body,
            IsRead = false,
            MediaUrl = mediaUrl,
        };

        return await repository.CreateAsync(notification, ct);
    }

    public async Task CreateAndDeliverAsync(
        Guid userId,
        PushNotificationType type,
        string title,
        string body,
        string? mediaUrl = null,
        CancellationToken ct = default
    )
    {
        var notificationId = await CreateAsync(userId, type, title, body, mediaUrl, ct);

        // Signal connected Expo clients immediately; fire-and-forget failures are acceptable
        // because the OS push notification (below) serves as the delivery fallback.
        try
        {
            await broadcaster.BroadcastAsync(userId, type, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "SignalR broadcast failed for user {UserId} — OS push will still deliver",
                userId
            );
        }

        var deviceTokens = await deviceTokenRepository.GetByUserIdsAsync([userId], ct);
        if (deviceTokens.Count == 0)
            return;

        var payload = new PushPayload(title, body, type.ToString());
        var dispatched = false;

        foreach (var token in deviceTokens)
        {
            var sender = ResolveSender(token.Platform);
            if (sender is null)
                continue;

            try
            {
                await sender.SendAsync(token.Token, payload, ct);
                dispatched = true;
            }
            catch (Exception ex)
            {
                logger.LogWarning(
                    ex,
                    "Push send failed for user {UserId} via {Platform}",
                    userId,
                    token.Platform
                );
            }
        }

        if (dispatched)
            await repository.SetPushSentAtAsync([notificationId], clock.Now(), ct);
    }

    public async Task DeliverTransientAsync(
        Guid userId,
        PushNotificationType type,
        string title,
        string body,
        string? entityId = null,
        CancellationToken ct = default
    )
    {
        var deviceTokens = await deviceTokenRepository.GetByUserIdsAsync([userId], ct);
        if (deviceTokens.Count == 0)
            return;

        var payload = new PushPayload(title, body, type.ToString(), entityId);

        foreach (var token in deviceTokens)
        {
            var sender = ResolveSender(token.Platform);
            if (sender is null)
                continue;

            try
            {
                await sender.SendAsync(token.Token, payload, ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(
                    ex,
                    "Transient push send failed for user {UserId} via {Platform}",
                    userId,
                    token.Platform
                );
            }
        }
    }

    public async Task DeliverTransientBulkAsync(
        IReadOnlyList<(Guid UserId, string Title, string Body)> notifications,
        PushNotificationType type,
        CancellationToken ct = default
    )
    {
        if (notifications.Count == 0)
            return;

        var userIds = notifications.Select(n => n.UserId).Distinct().ToList();
        var deviceTokens = await deviceTokenRepository.GetByUserIdsAsync(userIds, ct);
        var tokensByUser = deviceTokens
            .GroupBy(t => t.UserId)
            .ToDictionary(g => g.Key, g => g.ToList());

        foreach (var (userId, title, body) in notifications)
        {
            if (!tokensByUser.TryGetValue(userId, out var tokens))
                continue;

            var payload = new PushPayload(title, body, type.ToString());

            foreach (var token in tokens)
            {
                var sender = ResolveSender(token.Platform);
                if (sender is null)
                    continue;

                try
                {
                    await sender.SendAsync(token.Token, payload, ct);
                }
                catch (Exception ex)
                {
                    logger.LogWarning(
                        ex,
                        "Transient push send failed for user {UserId} via {Platform}",
                        userId,
                        token.Platform
                    );
                }
            }
        }
    }

    private IPushSender? ResolveSender(PushPlatform platform)
    {
        if (_senderMap.TryGetValue(platform, out var sender))
            return sender;

        // FCM handles both iOS and Android
        if (
            platform == PushPlatform.Android
            && _senderMap.TryGetValue(PushPlatform.iOS, out sender)
        )
            return sender;

        return null;
    }
}
