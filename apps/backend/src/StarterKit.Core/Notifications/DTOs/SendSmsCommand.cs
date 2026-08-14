namespace StarterKit.Core.Notifications.DTOs;

public sealed record SendSmsCommand(
    IReadOnlyList<Guid> ClubIds,
    IReadOnlyList<Guid> TeamIds,
    string Message
);
