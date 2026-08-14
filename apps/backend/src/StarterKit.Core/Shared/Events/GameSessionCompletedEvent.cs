using Mediator;

namespace StarterKit.Core.Shared.Events;

public sealed record GameSessionCompletedEvent(
    Guid UserId,
    Guid ClubId,
    Guid? TeamId,
    Guid GameId,
    Guid GameSessionId,
    int Score,
    decimal Percentage,
    bool Passed,
    double DurationSeconds,
    int TotalQuestions,
    DateTime StartedAt
) : INotification;
