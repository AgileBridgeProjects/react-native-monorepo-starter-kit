using Hangfire;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StarterKit.Core.Reports.Options;
using StarterKit.Core.Storage;
using StarterKit.Core.Storage.Interfaces;

namespace StarterKit.Core.Reports.Jobs;

/// <summary>
/// Recurring job that deletes full-dashboard export workbooks from the <c>report-exports</c>
/// container once they exceed <see cref="ReportExportOptions.RetentionHours"/>. Exports are
/// one-time downloads delivered via a SAS link over SignalR, so the stored blob is dead weight
/// afterwards — without this job the container would grow unbounded (ABC-123).
/// </summary>
public sealed class PurgeStaleReportExportsJob(
    IBlobStorageService blobStorageService,
    IOptions<ReportExportOptions> options,
    ILogger<PurgeStaleReportExportsJob> logger
)
{
    [AutomaticRetry(Attempts = 3)]
    public async Task ExecuteAsync(CancellationToken cancellationToken = default)
    {
        var deleted = await blobStorageService.DeleteOlderThanAsync(
            BlobContainerName.ReportExports,
            TimeSpan.FromHours(options.Value.RetentionHours),
            cancellationToken
        );

        if (deleted > 0)
            logger.LogInformation("Purged {Count} stale report export blob(s).", deleted);
    }
}
