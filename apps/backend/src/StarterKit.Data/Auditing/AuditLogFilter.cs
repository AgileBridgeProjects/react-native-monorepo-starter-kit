namespace StarterKit.Data.Auditing;

using StarterKit.Data.Auditing.Enums;

/// <summary>
/// Encapsulates filter and paging parameters for an audit log query.
/// Passed to <see cref="Interfaces.Repositories.IAuditLogRepository.ListAsync"/>.
/// </summary>
public sealed class AuditLogFilter
{
    public string? EntityName { get; init; }
    public string? EntityId { get; init; }
    public AuditAction? Action { get; init; }
    public string? UserId { get; init; }
    public Guid? ClubId { get; init; }
    public DateTime? From { get; init; }
    public DateTime? To { get; init; }
    public string? FilterText { get; init; }
    public string? SortBy { get; init; }
    public bool SortDescending { get; init; } = true;
    public int Page { get; init; }
    public int PageSize { get; init; }
}
