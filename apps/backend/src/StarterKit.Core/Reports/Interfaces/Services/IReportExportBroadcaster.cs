namespace StarterKit.Core.Reports.Interfaces.Services;

/// <summary>
/// Abstraction over the transport used to notify admin portal users when a queued
/// full-dashboard export completes or fails. Core stays transport-agnostic; the
/// SignalR implementation lives in <c>StarterKit.WebApi</c>.
/// </summary>
public interface IReportExportBroadcaster
{
    Task BroadcastExportReadyAsync(
        Guid userId,
        Guid exportId,
        string downloadUrl,
        CancellationToken cancellationToken = default
    );

    Task BroadcastExportFailedAsync(
        Guid userId,
        Guid exportId,
        string? errorMessage,
        CancellationToken cancellationToken = default
    );
}
