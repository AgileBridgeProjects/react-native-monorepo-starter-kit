namespace StarterKit.Data.Auditing.Interfaces.Repositories;

public interface IAuditLogRepository
{
    Task<(IReadOnlyList<AuditLog> Items, int TotalCount)> ListAsync(
        AuditLogFilter filter,
        CancellationToken cancellationToken
    );

    Task<AuditLog?> FindByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<AuditLog> GetAsync(Guid id, CancellationToken cancellationToken);

    Task<IReadOnlyList<string>> GetDistinctEntityNamesAsync(
        Guid? clubId,
        CancellationToken cancellationToken
    );

    Task<int> DeleteOlderThanAsync(DateTimeOffset cutoff, CancellationToken cancellationToken);
}
