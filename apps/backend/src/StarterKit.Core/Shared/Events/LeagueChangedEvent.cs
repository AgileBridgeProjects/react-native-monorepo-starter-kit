using Mediator;

namespace StarterKit.Core.Shared.Events;

public sealed record LeagueChangedEvent(
    Guid UserId,
    Guid ClubId,
    Guid? TeamId,
    string NewLeague,
    string? PreviousLeague
) : INotification;
