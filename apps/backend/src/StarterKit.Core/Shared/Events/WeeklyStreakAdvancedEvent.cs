using Mediator;

namespace StarterKit.Core.Shared.Events;

/// <summary>
/// Published when a user's weekly streak advances — i.e. they met their weekly active-days
/// target for the first time in the current ISO week and the consecutive-week count increased.
/// </summary>
public sealed record WeeklyStreakAdvancedEvent(
    Guid UserId,
    Guid ClubId,
    Guid? TeamId,
    int NewStreakWeeks
) : INotification;
