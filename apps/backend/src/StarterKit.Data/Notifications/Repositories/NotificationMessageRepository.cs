using Microsoft.EntityFrameworkCore;
using StarterKit.Data.Extensions;
using StarterKit.Data.Notifications.Enums;
using StarterKit.Data.Notifications.Interfaces.Repositories;
using StarterKit.Data.Notifications.Models;
using StarterKit.Data.Persistence;

namespace StarterKit.Data.Notifications.Repositories;

public class NotificationMessageRepository(AppDbContext dbContext) : INotificationMessageRepository
{
    public async Task AddAsync(
        NotificationMessage message,
        CancellationToken cancellationToken = default
    )
    {
        await dbContext.NotificationMessages.AddAsync(message, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<NotificationMessage?> FindByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        return await dbContext.NotificationMessages.FindAsync([id], cancellationToken);
    }

    public async Task<NotificationMessage> GetAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        return await dbContext.NotificationMessages.GetAsync(id, cancellationToken);
    }

    public async Task UpdateAsync(
        NotificationMessage message,
        CancellationToken cancellationToken = default
    )
    {
        dbContext.NotificationMessages.Update(message);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var message = await dbContext.NotificationMessages.GetAsync(id, cancellationToken);
        dbContext.NotificationMessages.Remove(message);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<(IReadOnlyList<NotificationMessage> Items, int TotalCount)> ListAsync(
        Guid clubId,
        int page,
        int pageSize,
        NotificationStatus? status = null,
        MessageChannel? channel = null,
        string? filterText = null,
        string? sortBy = null,
        bool sortDescending = false,
        CancellationToken cancellationToken = default
    )
    {
        var query = dbContext.NotificationMessages.AsNoTracking().AsQueryable();

        query = query.Where(x => x.ClubId == clubId);

        if (status.HasValue)
            query = query.Where(x => x.Status == status.Value);

        if (channel.HasValue)
            query = query.Where(x => x.Channel == channel.Value);

        if (!string.IsNullOrWhiteSpace(filterText))
            query = query.Where(x => x.Subject.Contains(filterText));

        var totalCount = await query.CountAsync(cancellationToken);

        query = sortBy?.ToLowerInvariant() switch
        {
            "subject" => sortDescending
                ? query.OrderByDescending(x => x.Subject)
                : query.OrderBy(x => x.Subject),
            "status" => sortDescending
                ? query.OrderByDescending(x => x.Status)
                : query.OrderBy(x => x.Status),
            "sentat" => sortDescending
                ? query.OrderByDescending(x => x.SentAt)
                : query.OrderBy(x => x.SentAt),
            _ => query.OrderByDescending(x => x.CreatedAt),
        };

        var items = await query.ApplyPaging(page, pageSize).ToListAsync(cancellationToken);

        return (items, totalCount);
    }
}
