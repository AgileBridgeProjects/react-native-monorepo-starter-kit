using Hangfire;

namespace StarterKit.Core.Notifications.Interfaces.Services;

public interface ICommunicationsJobProcessor
{
    [AutomaticRetry(Attempts = 3, DelaysInSeconds = [30, 120, 600])]
    Task ProcessAsync(Guid notificationMessageId, IJobCancellationToken cancellationToken);
}
