using StarterKit.Data.Auditing.Enums;

namespace StarterKit.Core.Auditing;

public sealed record AuditLogEntry
{
    public required Guid Id { get; init; }
    public required string EntityName { get; init; }
    public required string EntityId { get; init; }
    public required AuditAction Action { get; init; }
    public string? OldValues { get; init; }
    public string? NewValues { get; init; }
    public string? UserId { get; init; }
    public string? UserName { get; init; }
    public required DateTime Timestamp { get; init; }
}
