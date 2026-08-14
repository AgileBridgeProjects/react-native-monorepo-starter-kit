using System.ComponentModel.DataAnnotations;
using StarterKit.Data.Notifications.Enums;

namespace StarterKit.WebApi.Notifications.DTOs;

public sealed record UpdateNotificationMessageRequest(
    string? Subject,
    [Required] [MinLength(1)] string Message,
    [Required] MessageChannel Channel,
    [Required] Guid ClubId,
    Guid? TeamId,
    IReadOnlyList<AttachmentRequest>? Attachments,
    AttachmentRequest? MediaAttachment = null,
    bool ClearMedia = false
);
