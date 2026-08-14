using StarterKit.Core.Auditing.Interfaces.Services;
using StarterKit.Core.Common;
using StarterKit.Core.Interfaces;
using StarterKit.Data.Auditing;
using StarterKit.Data.Auditing.Interfaces.Repositories;
using StarterKit.Data.Users.Interfaces.Repositories;

namespace StarterKit.Core.Auditing.Services;

public sealed class AuditLogService(
    IAuditLogRepository auditLogRepository,
    IUserRepository userRepository,
    ICurrentSession session
) : IAuditLogService
{
    public async Task<IPagedResult<AuditLogEntry>> ListAsync(
        AuditLogQuery query,
        CancellationToken cancellationToken
    )
    {
        var filter = new AuditLogFilter
        {
            ClubId = EffectiveClubId(),
            EntityName = query.EntityName,
            EntityId = query.EntityId,
            Action = query.Action,
            UserId = query.UserId,
            From = query.From,
            To = query.To,
            FilterText = query.FilterText,
            SortBy = query.SortBy,
            SortDescending = query.SortDescending,
            Page = query.ClampedPage,
            PageSize = query.ClampedPageSize,
        };

        var (items, totalCount) = await auditLogRepository.ListAsync(filter, cancellationToken);

        var userNames = await ResolveUserNamesAsync(items.Select(x => x.UserId), cancellationToken);

        return new PagedResult<AuditLogEntry>
        {
            Items = items.Select(log => ToEntry(log, userNames)).ToList(),
            TotalCount = totalCount,
            Page = query.ClampedPage,
            PageSize = query.ClampedPageSize,
        };
    }

    public async Task<AuditLogEntry?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var log = await auditLogRepository.FindByIdAsync(id, cancellationToken);
        if (log is null)
            return null;

        // Prevent cross-tenant reads — verify log belongs to the effective club.
        var effectiveClub = EffectiveClubId();
        if (effectiveClub.HasValue && log.ClubId != effectiveClub)
            return null;

        var userNames = await ResolveUserNamesAsync([log.UserId], cancellationToken);
        return ToEntry(log, userNames);
    }

    public Task<IReadOnlyList<string>> GetDistinctEntityNamesAsync(
        CancellationToken cancellationToken
    ) => auditLogRepository.GetDistinctEntityNamesAsync(EffectiveClubId(), cancellationToken);

    public Task<int> PurgeOlderThanAsync(int retentionDays, CancellationToken cancellationToken)
    {
        var cutoff = DateTimeOffset.UtcNow.AddDays(-retentionDays);
        return auditLogRepository.DeleteOlderThanAsync(cutoff, cancellationToken);
    }

    // SuperAdmin without impersonation sees all clubs; everyone else is scoped.
    private Guid? EffectiveClubId() =>
        session.IsSuperAdmin && !session.IsImpersonating
            ? null
            : session.ImpersonatedClubId ?? session.ClubIdOrDefault;

    private async Task<Dictionary<string, string>> ResolveUserNamesAsync(
        IEnumerable<string?> userIds,
        CancellationToken cancellationToken
    )
    {
        var uniqueIds = userIds
            .Where(id => id != null && Guid.TryParse(id, out _))
            .Select(id => Guid.Parse(id!))
            .Distinct()
            .ToList();

        if (uniqueIds.Count == 0)
            return [];

        var tasks = uniqueIds.Select(id => userRepository.FindByIdAsync(id, cancellationToken));
        var users = await Task.WhenAll(tasks);

        return users
            .Where(u => u is not null)
            .ToDictionary(u => u!.Id.ToString(), u => u!.DisplayName);
    }

    private static AuditLogEntry ToEntry(AuditLog log, Dictionary<string, string> userNames) =>
        new()
        {
            Id = log.Id,
            EntityName = log.EntityName,
            EntityId = log.EntityId,
            Action = log.Action,
            OldValues = log.OldValues,
            NewValues = log.NewValues,
            UserId = log.UserId,
            UserName =
                log.UserId != null && userNames.TryGetValue(log.UserId, out var name) ? name : null,
            Timestamp = log.Timestamp,
        };
}
