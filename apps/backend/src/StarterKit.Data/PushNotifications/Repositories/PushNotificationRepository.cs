using Microsoft.EntityFrameworkCore;
using StarterKit.Data.Extensions;
using StarterKit.Data.Persistence;
using StarterKit.Data.PushNotifications.Enums;
using StarterKit.Data.PushNotifications.Interfaces.Repositories;
using StarterKit.Data.PushNotifications.Models;

namespace StarterKit.Data.PushNotifications.Repositories;

internal sealed class PushNotificationRepository(AppDbContext db, TimeProvider clock)
    : IPushNotificationRepository
{
    public async Task<Guid> CreateAsync(
        PushNotification notification,
        CancellationToken ct = default
    )
    {
        notification.CreatedAt = clock.Now();
        db.PushNotifications.Add(notification);
        await db.SaveChangesAsync(ct);
        return notification.Id;
    }

    public async Task<(
        IReadOnlyList<PushNotification> Items,
        int TotalCount,
        int UnreadCount
    )> ListAsync(Guid userId, int page, int pageSize, CancellationToken ct = default)
    {
        var q = db
            .PushNotifications.AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt);

        var totalCount = await q.CountAsync(ct);
        var unreadCount = await q.CountAsync(n => !n.IsRead, ct);

        var items = await q.ApplyPaging(page, pageSize).ToListAsync(ct);

        return (items, totalCount, unreadCount);
    }

    public Task<PushNotification?> FindByIdAsync(Guid id, CancellationToken ct = default) =>
        db.PushNotifications.FirstOrDefaultAsync(n => n.Id == id, ct);

    public async Task MarkReadAsync(Guid id, Guid userId, CancellationToken ct = default)
    {
        await db
            .PushNotifications.Where(n => n.Id == id && n.UserId == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), ct);
    }

    public async Task MarkAllReadAsync(Guid userId, CancellationToken ct = default)
    {
        await db
            .PushNotifications.Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), ct);
    }

    public async Task MarkSeenAsync(Guid id, Guid userId, CancellationToken ct = default)
    {
        var now = clock.Now();
        await db
            .PushNotifications.Where(n => n.Id == id && n.UserId == userId && n.SeenAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.SeenAt, now), ct);
    }

    public async Task<IReadOnlyList<SweepCandidate>> GetSweepCandidatesAsync(
        TimeSpan inactiveThreshold,
        CancellationToken ct = default
    )
    {
        var now = clock.Now();
        var inactiveCutoff = now - inactiveThreshold;

        var results = await db
            .PushNotifications.AsNoTracking()
            .Where(n =>
                n.PushSentAt == null
                && n.SeenAt == null
                && n.User.LastActiveAt < inactiveCutoff
                && (
                    n.NotificationType == PushNotificationType.NewContent
                    || n.NotificationType == PushNotificationType.WeeklyNudge
                )
            )
            .Select(n => new SweepCandidate(
                n.Id,
                n.UserId,
                n.NotificationType.ToString(),
                n.Title,
                n.Body
            ))
            .ToListAsync(ct);

        return results;
    }

    public async Task SetPushSentAtAsync(
        IReadOnlyList<Guid> notificationIds,
        DateTime sentAt,
        CancellationToken ct = default
    )
    {
        await db
            .PushNotifications.Where(n => notificationIds.Contains(n.Id))
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.PushSentAt, sentAt), ct);
    }
}
