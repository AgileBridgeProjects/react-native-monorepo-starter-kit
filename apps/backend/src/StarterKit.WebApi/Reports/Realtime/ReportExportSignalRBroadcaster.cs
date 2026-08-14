using Microsoft.AspNetCore.SignalR;
using StarterKit.Core.Reports.Interfaces.Services;
using StarterKit.WebApi.Realtime;

namespace StarterKit.WebApi.Reports.Realtime;

/// <summary>
/// <see cref="IReportExportBroadcaster"/> implementation that delivers export-ready and
/// export-failed signals to admin portal users over SignalR. Lives in
/// <c>StarterKit.WebApi</c> so <c>StarterKit.Core</c> stays transport-agnostic.
/// </summary>
internal sealed class ReportExportSignalRBroadcaster(
    IHubContext<AdminRealtimeHub, IAdminRealtimeHub> hubContext
) : IReportExportBroadcaster
{
    public Task BroadcastExportReadyAsync(
        Guid userId,
        Guid exportId,
        string downloadUrl,
        CancellationToken cancellationToken = default
    ) =>
        hubContext
            .Clients.User(userId.ToString())
            .ReceiveExportReadyAsync(exportId, downloadUrl, cancellationToken);

    public Task BroadcastExportFailedAsync(
        Guid userId,
        Guid exportId,
        string? errorMessage,
        CancellationToken cancellationToken = default
    ) =>
        hubContext
            .Clients.User(userId.ToString())
            .ReceiveExportFailedAsync(exportId, errorMessage, cancellationToken);
}
