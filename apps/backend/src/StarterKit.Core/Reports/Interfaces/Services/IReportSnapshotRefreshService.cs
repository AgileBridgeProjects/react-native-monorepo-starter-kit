using Hangfire;

namespace StarterKit.Core.Reports.Interfaces.Services;

public interface IReportSnapshotRefreshService
{
    [AutomaticRetry(Attempts = 0)]
    [DisableConcurrentExecution(timeoutInSeconds: 0)]
    Task ExecuteAsync(IJobCancellationToken cancellationToken);

    Task BackfillAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken = default);
}
