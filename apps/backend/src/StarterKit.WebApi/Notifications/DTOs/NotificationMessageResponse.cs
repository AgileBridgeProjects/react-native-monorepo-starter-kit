using StarterKit.Data.Notifications.Enums;

namespace StarterKit.WebApi.Notifications.DTOs;

public sealed record NotificationMessageResponse(
    Guid Id,
    string Subject,
    string Message,
    NotificationStatus Status,
    MessageChannel Channel,
    Guid ClubId,
    Guid? TeamId,
    int? TotalRecipients,
    int? Delivered,
    int? Failed,
    DateTime? SentAt,
    string? SentBy,
    DateTime CreatedAt,
    string? CreatedBy,
    IReadOnlyList<AttachmentResponse> Attachments,
    string? MediaUrl = null
);
