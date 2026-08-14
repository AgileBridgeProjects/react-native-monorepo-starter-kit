using Riok.Mapperly.Abstractions;
using StarterKit.Core.Notifications.DTOs;
using StarterKit.Data.Notifications.Models;
using StarterKit.WebApi.Notifications.DTOs;

namespace StarterKit.WebApi.Notifications.Mappers;

[Mapper]
public static partial class NotificationMessageMapper
{
    public static NotificationMessageResponse ToResponse(this NotificationMessage entity) =>
        new(
            entity.Id,
            entity.Subject,
            entity.Message,
            entity.Status,
            entity.Channel,
            entity.ClubId,
            entity.TeamId,
            entity.TotalRecipients,
            entity.Delivered,
            entity.Failed,
            entity.SentAt,
            entity.SentBy,
            entity.CreatedAt,
            entity.CreatedBy,
            entity.Attachments.Select(a => a.ToResponse()).ToList(),
            entity.MediaUrl
        );

    public static partial AttachmentResponse ToResponse(this StoredAttachment attachment);

    public static List<AttachmentInput>? ToAttachmentInputs(
        this IReadOnlyList<AttachmentRequest>? requests
    ) =>
        requests
            ?.Select(a => new AttachmentInput(a.FileName, a.ContentType, a.ContentBase64))
            .ToList();

    public static AttachmentInput ToAttachmentInput(this AttachmentRequest request) =>
        new(request.FileName, request.ContentType, request.ContentBase64);

    public static List<EmailAttachment>? ToEmailAttachments(
        this IReadOnlyList<AttachmentRequest>? requests
    ) =>
        requests
            ?.Select(a => new EmailAttachment(a.ContentType, a.FileName, a.ContentBase64))
            .ToList();
}
