using System.ComponentModel.DataAnnotations;
using StarterKit.Core.Notifications;

namespace StarterKit.WebApi.Notifications.DTOs;

/// <summary>Request body for the send-sms endpoint.</summary>
public sealed record SendSmsRequest(
    /// <summary>One or more club IDs. At least one of <see cref="ClubIds"/> or <see cref="TeamIds"/> must be non-empty.</summary>
    IReadOnlyList<Guid>? ClubIds,
    /// <summary>One or more team IDs. At least one of <see cref="ClubIds"/> or <see cref="TeamIds"/> must be non-empty.</summary>
    IReadOnlyList<Guid>? TeamIds,
    [Required] [MinLength(1)] [MaxLength(SmsLimits.MaxMessageLength)] string Message
);
