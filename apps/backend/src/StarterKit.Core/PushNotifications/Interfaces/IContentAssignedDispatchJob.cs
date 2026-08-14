using Hangfire;
using StarterKit.Data.PushNotifications.Enums;

namespace StarterKit.Core.PushNotifications.Interfaces;

public interface IContentAssignedDispatchJob
{
    [AutomaticRetry(Attempts = 0)]
    Task ExecuteAsync(
        PushNotificationType notificationType,
        string title,
        string body,
        IReadOnlyList<Guid> userIds,
        int attemptNumber,
        string? mediaUrl,
        IJobCancellationToken cancellationToken
    );
}
