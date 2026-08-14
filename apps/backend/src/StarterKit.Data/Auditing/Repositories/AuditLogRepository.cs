using Microsoft.EntityFrameworkCore;
using StarterKit.Data.Auditing.Interfaces.Repositories;
using StarterKit.Data.Extensions;
using StarterKit.Data.Persistence;

namespace StarterKit.Data.Auditing.Repositories;

internal sealed class AuditLogRepository(AppDbContext db) : IAuditLogRepository
{
    public async Task<(IReadOnlyList<AuditLog> Items, int TotalCount)> ListAsync(
        AuditLogFilter filter,
        CancellationToken cancellationToken
    )
    {
        var q = db.AuditLogs.AsNoTracking();

        if (filter.ClubId.HasValue)
            q = q.Where(x => x.ClubId == filter.ClubId.Value);

        if (!string.IsNullOrWhiteSpace(filter.EntityName))
            q = q.Where(x => x.EntityName == filter.EntityName);

        if (!string.IsNullOrWhiteSpace(filter.EntityId))
            q = q.Where(x => x.EntityId == filter.EntityId);

        if (filter.Action.HasValue)
            q = q.Where(x => x.Action == filter.Action.Value);

        if (!string.IsNullOrWhiteSpace(filter.UserId))
            q = q.Where(x => x.UserId == filter.UserId);

        if (filter.From.HasValue)
            q = q.Where(x => x.Timestamp >= filter.From.Value);

        if (filter.To.HasValue)
            q = q.Where(x => x.Timestamp <= filter.To.Value);

        if (!string.IsNullOrWhiteSpace(filter.FilterText))
        {
            var ft = filter.FilterText;
            q = q.Where(x =>
                x.EntityName.Contains(ft)
                || x.EntityId.Contains(ft)
                || (x.UserId != null && x.UserId.Contains(ft))
                || (x.OldValues != null && x.OldValues.Contains(ft))
                || (x.NewValues != null && x.NewValues.Contains(ft))
            );
        }

        var totalCount = await q.CountAsync(cancellationToken);

        var items = await q.ApplySorting(
                filter.SortBy,
                filter.SortDescending,
                defaultSort: "Timestamp"
            )
            // Deterministic paging: without a unique tiebreaker, rows sharing a sort value can
            // swap pages between requests.
            .ThenBy(x => x.Id)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public Task<AuditLog?> FindByIdAsync(Guid id, CancellationToken cancellationToken) =>
        db.AuditLogs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<AuditLog> GetAsync(Guid id, CancellationToken cancellationToken) =>
        db.AuditLogs.GetAsync(id, cancellationToken);

    public async Task<IReadOnlyList<string>> GetDistinctEntityNamesAsync(
        Guid? clubId,
        CancellationToken cancellationToken
    )
    {
        var q = db.AuditLogs.AsNoTracking();

        if (clubId.HasValue)
            q = q.Where(x => x.ClubId == clubId.Value);

        var names = await q.Select(x => x.EntityName)
            .Distinct()
            .OrderBy(x => x)
            .ToListAsync(cancellationToken);

        return names;
    }

    public async Task<int> DeleteOlderThanAsync(
        DateTimeOffset cutoff,
        CancellationToken cancellationToken
    )
    {
        return await db
            .AuditLogs.Where(x => x.Timestamp < cutoff)
            .ExecuteDeleteAsync(cancellationToken);
    }
}
