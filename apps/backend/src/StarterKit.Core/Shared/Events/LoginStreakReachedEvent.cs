using Mediator;

namespace StarterKit.Core.Shared.Events;

public sealed record LoginStreakReachedEvent(
    Guid UserId,
    Guid ClubId,
    Guid? TeamId,
    int WeeklyActiveDays,
    int MonthlyActiveDays
) : INotification;
