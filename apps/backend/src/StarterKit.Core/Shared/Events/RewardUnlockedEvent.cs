using Mediator;

namespace StarterKit.Core.Shared.Events;

public sealed record RewardUnlockedEvent(
    Guid UserId,
    Guid ClubId,
    Guid RewardDefinitionId,
    Guid RewardRuleId,
    string RewardName,
    int Instance
) : INotification;
