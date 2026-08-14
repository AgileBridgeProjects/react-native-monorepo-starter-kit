using Microsoft.Extensions.Logging;
using StarterKit.Core.PushNotifications.Interfaces;
using StarterKit.Data.DeviceTokens.Enums;
using StarterKit.Data.DeviceTokens.Interfaces.Repositories;
using StarterKit.Data.Extensions;
using StarterKit.Data.PushNotifications.Interfaces.Repositories;

namespace StarterKit.Core.PushNotifications.Jobs;

/// <summary>
/// Hangfire recurring job that runs every 30 minutes.
/// Acts as a safety net for notifications that were not pushed immediately
/// (e.g. device token lookup failed, sender error) and handles weekly nudge
/// notifications for inactive users. Skips notifications where PushSentAt is already set.
/// </summary>
public sealed class PushNotificationSweepJob(
    IPushNotificationRepository notificationRepo,
    IDeviceTokenRepository deviceTokenRepo,
    IEnumerable<IPushSender> pushSenders,
    TimeProvider clock,
    ILogger<PushNotificationSweepJob> logger
)
{
    // A user is considered "inactive" if they haven't been seen for more than this threshold.
    private static readonly TimeSpan InactiveThreshold = TimeSpan.FromMinutes(15);

    private readonly Dictionary<PushPlatform, IPushSender> _senderMap = pushSenders.ToDictionary(
        s => s.Platform
    );

    public async Task ExecuteAsync(CancellationToken cancellationToken = default)
    {
        logger.LogInformation("PushNotificationSweepJob: starting sweep");

        var candidates = await notificationRepo.GetSweepCandidatesAsync(
            InactiveThreshold,
            cancellationToken
        );

        if (candidates.Count == 0)
        {
            logger.LogInformation("PushNotificationSweepJob: no candidates found");
            return;
        }

        var userIds = candidates.Select(c => c.UserId).Distinct().ToList();
        var deviceTokens = await deviceTokenRepo.GetByUserIdsAsync(userIds, cancellationToken);
        var tokensByUser = deviceTokens
            .GroupBy(t => t.UserId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var sentIds = new List<Guid>();
        var now = clock.Now();

        foreach (var candidate in candidates)
        {
            if (!tokensByUser.TryGetValue(candidate.UserId, out var tokens))
                continue;

            var payload = new PushPayload(
                candidate.Title,
                candidate.Body,
                candidate.NotificationType
            );
            var dispatched = false;

            foreach (var token in tokens)
            {
                if (!_senderMap.TryGetValue(token.Platform, out var sender))
                {
                    // HuaweiHMS uses a separate sender key; iOS/Android both use ExpoPushSender
                    if (
                        token.Platform == PushPlatform.Android
                        && _senderMap.TryGetValue(PushPlatform.iOS, out sender)
                    )
                    { /* FCM handles both iOS and Android */
                    }
                    else
                        continue;
                }

                try
                {
                    await sender.SendAsync(token.Token, payload, cancellationToken);
                    dispatched = true;
                }
                catch (Exception ex)
                {
                    logger.LogWarning(
                        ex,
                        "PushNotificationSweepJob: failed to send to user {UserId} via {Platform}",
                        candidate.UserId,
                        token.Platform
                    );
                }
            }

            if (dispatched)
                sentIds.Add(candidate.NotificationId);
        }

        if (sentIds.Count > 0)
            await notificationRepo.SetPushSentAtAsync(sentIds, now, cancellationToken);

        logger.LogInformation(
            "PushNotificationSweepJob: dispatched {Sent}/{Total} notifications",
            sentIds.Count,
            candidates.Count
        );
    }
}
