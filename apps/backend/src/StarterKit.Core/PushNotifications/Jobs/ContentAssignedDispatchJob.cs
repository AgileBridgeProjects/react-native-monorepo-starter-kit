using Hangfire;
using Microsoft.Extensions.Logging;
using StarterKit.Core.PushNotifications.Interfaces;
using StarterKit.Data.PushNotifications.Enums;

namespace StarterKit.Core.PushNotifications.Jobs;

/// <summary>
/// Hangfire fire-and-forget job that creates a push notification record for each user
/// in the supplied list and immediately delivers an OS-level push notification via
/// Expo / HMS. Used for admin bulk in-app messages / broadcasts so the HTTP request
/// returns quickly.
/// </summary>
public sealed class ContentAssignedDispatchJob(
    IPushNotificationsService pushNotificationsService,
    IBackgroundJobClient backgroundJobClient,
    ILogger<ContentAssignedDispatchJob> logger
) : IContentAssignedDispatchJob
{
    private const int MaxAttempts = 3;

    [AutomaticRetry(Attempts = 0)]
    public async Task ExecuteAsync(
        PushNotificationType notificationType,
        string title,
        string body,
        IReadOnlyList<Guid> userIds,
        int attemptNumber,
        string? mediaUrl,
        IJobCancellationToken cancellationToken
    )
    {
        var ct = cancellationToken.ShutdownToken;

        var failedUserIds = new List<Guid>();

        foreach (var userId in userIds)
        {
            try
            {
                await pushNotificationsService.CreateAndDeliverAsync(
                    userId,
                    notificationType,
                    title,
                    body,
                    mediaUrl,
                    ct
                );
            }
            catch (OperationCanceledException)
            {
                throw; // Respect shutdown; Hangfire will re-enqueue
            }
            catch (Exception ex)
            {
                logger.LogWarning(
                    ex,
                    "ContentAssignedDispatchJob: failed to create {NotificationType} notification for user {UserId}, will retry in a follow-up job",
                    notificationType,
                    userId
                );
                failedUserIds.Add(userId);
            }
        }

        if (failedUserIds.Count > 0)
        {
            if (attemptNumber >= MaxAttempts)
            {
                logger.LogError(
                    "ContentAssignedDispatchJob: giving up after {MaxAttempts} attempts — {FailedCount} user(s) never notified for {NotificationType}",
                    MaxAttempts,
                    failedUserIds.Count,
                    notificationType
                );
                return;
            }

            logger.LogWarning(
                "ContentAssignedDispatchJob: {FailedCount}/{TotalCount} notifications failed — scheduling retry job (attempt {Next}/{Max})",
                failedUserIds.Count,
                userIds.Count,
                attemptNumber + 1,
                MaxAttempts
            );
            backgroundJobClient.Enqueue<IContentAssignedDispatchJob>(j =>
                j.ExecuteAsync(
                    notificationType,
                    title,
                    body,
                    failedUserIds,
                    attemptNumber + 1,
                    mediaUrl,
                    JobCancellationToken.Null
                )
            );
        }
    }
}
