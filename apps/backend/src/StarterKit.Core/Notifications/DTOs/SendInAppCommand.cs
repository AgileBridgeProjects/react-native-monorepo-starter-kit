namespace StarterKit.Core.Notifications.DTOs;

public sealed record SendInAppCommand(
    IReadOnlyList<Guid> ClubIds,
    IReadOnlyList<Guid> TeamIds,
    string Subject,
    string Message,
    string? MediaUrl = null
);
