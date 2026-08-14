using System.ComponentModel.DataAnnotations;

namespace StarterKit.WebApi.Notifications.DTOs;

/// <summary>Request body for the send-email endpoint.</summary>
public sealed record SendEmailRequest(
    /// <summary>One or more club IDs. At least one of <see cref="ClubIds"/> or <see cref="TeamIds"/> must be non-empty.</summary>
    IReadOnlyList<Guid>? ClubIds,
    /// <summary>One or more team IDs. At least one of <see cref="ClubIds"/> or <see cref="TeamIds"/> must be non-empty.</summary>
    IReadOnlyList<Guid>? TeamIds,
    [Required] [MinLength(1)] string Subject,
    [Required] [MinLength(1)] string Message,
    IReadOnlyList<AttachmentRequest>? Attachments
);
