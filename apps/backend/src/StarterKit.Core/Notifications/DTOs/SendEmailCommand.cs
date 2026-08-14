namespace StarterKit.Core.Notifications.DTOs;

/// <summary>
/// The command to send an admin-composed email communication to a set of
/// club or team recipients.
/// </summary>
public sealed record SendEmailCommand(
    /// <summary>Zero or more club IDs to target. At least one of ClubIds or TeamIds must be non-empty.</summary>
    IReadOnlyList<Guid> ClubIds,
    /// <summary>Zero or more team IDs to target. At least one of ClubIds or TeamIds must be non-empty.</summary>
    IReadOnlyList<Guid> TeamIds,
    string Subject,
    string Message,
    IReadOnlyList<EmailAttachment>? Attachments = null
);
