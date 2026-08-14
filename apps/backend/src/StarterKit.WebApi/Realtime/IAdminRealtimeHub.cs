namespace StarterKit.WebApi.Realtime;

/// <summary>
/// Client-side SignalR contract for admin portal realtime events.
/// </summary>
public interface IAdminRealtimeHub
{
    Task ReceiveAiJobCompletedAsync(Guid jobId, CancellationToken cancellationToken = default);

    Task ReceiveAiJobFailedAsync(
        Guid jobId,
        string? errorMessage,
        CancellationToken cancellationToken = default
    );

    Task ReceiveExportReadyAsync(
        Guid exportId,
        string downloadUrl,
        CancellationToken cancellationToken = default
    );

    Task ReceiveExportFailedAsync(
        Guid exportId,
        string? errorMessage,
        CancellationToken cancellationToken = default
    );

    Task ReceiveNotificationMessageStatusChangedAsync(
        Guid notificationMessageId,
        Guid clubId,
        string status,
        CancellationToken cancellationToken = default
    );
}
