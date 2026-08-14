using StarterKit.Data.PushNotifications.Models;

namespace StarterKit.Data.PushNotifications.Interfaces.Repositories;

public interface IPushNotificationRepository
{
    Task<Guid> CreateAsync(PushNotification notification, CancellationToken ct = default);

    Task<(IReadOnlyList<PushNotification> Items, int TotalCount, int UnreadCount)> ListAsync(
        Guid userId,
        int page,
        int pageSize,
        CancellationToken ct = default
    );

    Task<PushNotification?> FindByIdAsync(Guid id, CancellationToken ct = default);
    Task MarkReadAsync(Guid id, Guid userId, CancellationToken ct = default);
    Task MarkAllReadAsync(Guid userId, CancellationToken ct = default);
    Task MarkSeenAsync(Guid id, Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Returns pending notifications for the sweep job:
    /// PushSentAt IS NULL, SeenAt IS NULL, user inactive for more than <paramref name="inactiveThreshold"/>.
    /// Applies the 2-hour grace window for RewardUnlocked.
    /// </summary>
    Task<IReadOnlyList<SweepCandidate>> GetSweepCandidatesAsync(
        TimeSpan inactiveThreshold,
        CancellationToken ct = default
    );

    /// <summary>Sets PushSentAt = now for all supplied notification IDs in a single UPDATE.</summary>
    Task SetPushSentAtAsync(
        IReadOnlyList<Guid> notificationIds,
        DateTime sentAt,
        CancellationToken ct = default
    );
}
