using StarterKit.Core.Common;
using StarterKit.Data.Auditing;
using StarterKit.Data.Auditing.Enums;

namespace StarterKit.Core.Auditing;

public sealed class AuditLogQuery : PagedAndFilteredQuery
{
    public string? EntityName { get; init; }
    public string? EntityId { get; init; }
    public AuditAction? Action { get; init; }
    public string? UserId { get; init; }
    public DateTime? From { get; init; }
    public DateTime? To { get; init; }
}
