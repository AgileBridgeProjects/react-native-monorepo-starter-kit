using Hangfire;
using Microsoft.Extensions.Logging;
using StarterKit.Core.Notifications.DTOs;
using StarterKit.Core.Notifications.Interfaces;
using StarterKit.Core.Notifications.Interfaces.Services;
using StarterKit.Core.Storage.Interfaces;
using StarterKit.Data.Extensions;
using StarterKit.Data.Notifications.Enums;
using StarterKit.Data.Notifications.Interfaces.Repositories;
using StarterKit.Data.Notifications.Models;

namespace StarterKit.Core.Notifications.Services;

/// <summary>
/// Executes a notification send job in the background via Hangfire.
/// Resolved from DI — one scope per job invocation.
/// </summary>
public sealed class CommunicationsJobProcessor(
    INotificationMessageRepository repository,
    ICommunicationsService communicationsService,
    IBlobStorageService blobStorageService,
    INotificationMessageBroadcaster broadcaster,
    TimeProvider clock,
    ILogger<CommunicationsJobProcessor> logger
) : ICommunicationsJobProcessor
{
    [AutomaticRetry(Attempts = 3, DelaysInSeconds = [30, 120, 600])]
    public async Task ProcessAsync(
        Guid notificationMessageId,
        IJobCancellationToken cancellationToken
    )
    {
        var ct = cancellationToken.ShutdownToken;

        var entity = await repository.GetAsync(notificationMessageId, ct);

        if (entity.Status is NotificationStatus.Sent)
        {
            logger.LogWarning(
                "Notification {Id} already sent — skipping duplicate job execution",
                notificationMessageId
            );
            return;
        }

        try
        {
            var clubIds = entity.TeamId.HasValue ? Array.Empty<Guid>() : [entity.ClubId];
            var teamIds = entity.TeamId.HasValue
                ? new[] { entity.TeamId.Value }
                : Array.Empty<Guid>();

            var result = entity.Channel switch
            {
                MessageChannel.Sms => await communicationsService.SendSmsAsync(
                    new SendSmsCommand(clubIds, teamIds, entity.Message),
                    ct
                ),
                MessageChannel.InApp => await communicationsService.SendInAppAsync(
                    new SendInAppCommand(
                        clubIds,
                        teamIds,
                        entity.Subject,
                        entity.Message,
                        entity.MediaUrl
                    ),
                    ct
                ),
                _ => await communicationsService.SendEmailAsync(
                    new SendEmailCommand(
                        clubIds,
                        teamIds,
                        entity.Subject,
                        entity.Message,
                        await DownloadStoredAttachmentsAsync(entity.Attachments, ct)
                    ),
                    ct
                ),
            };

            entity.Status =
                result.Failed > 0 && result.Delivered == 0
                    ? NotificationStatus.Failed
                    : NotificationStatus.Sent;
            entity.TotalRecipients = result.TotalRecipients;
            entity.Delivered = result.Delivered;
            entity.Failed = result.Failed;
            entity.SentAt = clock.Now();

            await repository.UpdateAsync(entity, ct);

            logger.LogInformation(
                "Notification {Id} processed — Delivered: {Delivered}, Failed: {Failed}",
                notificationMessageId,
                result.Delivered,
                result.Failed
            );

            await broadcaster.BroadcastStatusChangedAsync(
                entity.Id,
                entity.ClubId,
                entity.Status.ToString(),
                ct
            );
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Notification {Id} job failed", notificationMessageId);

            entity.Status = NotificationStatus.Failed;
            await repository.UpdateAsync(entity, ct);

            // Best-effort broadcast — failure here must not suppress the re-throw
            // that allows Hangfire to retry the job.
            try
            {
                await broadcaster.BroadcastStatusChangedAsync(
                    entity.Id,
                    entity.ClubId,
                    entity.Status.ToString(),
                    ct
                );
            }
            catch (Exception broadcastEx)
            {
                logger.LogWarning(
                    broadcastEx,
                    "Failed to broadcast status change for notification {Id}",
                    notificationMessageId
                );
            }

            throw; // Re-throw so Hangfire can retry
        }
    }

    private async Task<List<EmailAttachment>> DownloadStoredAttachmentsAsync(
        List<StoredAttachment> storedAttachments,
        CancellationToken cancellationToken
    )
    {
        if (storedAttachments.Count == 0)
            return [];

        var results = new List<EmailAttachment>(storedAttachments.Count);
        foreach (var att in storedAttachments)
        {
            var file = await blobStorageService.DownloadAsync(att.BlobPath, cancellationToken);
            if (file is null)
                continue;

            await using (file.Content)
            {
                using var ms = new MemoryStream();
                await file.Content.CopyToAsync(ms, cancellationToken);
                results.Add(
                    new EmailAttachment(
                        att.ContentType,
                        att.FileName,
                        Convert.ToBase64String(ms.ToArray())
                    )
                );
            }
        }
        return results;
    }
}
