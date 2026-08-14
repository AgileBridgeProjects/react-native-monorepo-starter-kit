using StarterKit.Core.Reports.Interfaces.Services;

namespace StarterKit.Core.Reports.Services;

internal sealed class NoOpReportExportBroadcaster : IReportExportBroadcaster
{
    public Task BroadcastExportReadyAsync(
        Guid userId,
        Guid exportId,
        string downloadUrl,
        CancellationToken cancellationToken = default
    ) => Task.CompletedTask;

    public Task BroadcastExportFailedAsync(
        Guid userId,
        Guid exportId,
        string? errorMessage,
        CancellationToken cancellationToken = default
    ) => Task.CompletedTask;
}
