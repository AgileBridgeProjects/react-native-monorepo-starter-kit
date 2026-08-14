using StarterKit.Core.Common;

namespace StarterKit.Core.Auditing.Interfaces.Services;

public interface IAuditLogService
{
    Task<IPagedResult<AuditLogEntry>> ListAsync(
        AuditLogQuery query,
        CancellationToken cancellationToken
    );

    Task<AuditLogEntry?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<IReadOnlyList<string>> GetDistinctEntityNamesAsync(CancellationToken cancellationToken);

    Task<int> PurgeOlderThanAsync(int retentionDays, CancellationToken cancellationToken);
}
