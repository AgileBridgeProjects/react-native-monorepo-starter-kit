using StarterKit.Data.Auditing.Enums;

namespace StarterKit.WebApi.Auditing.DTOs;

public sealed class AuditLogResponse
{
    public Guid Id { get; init; }
    public string EntityName { get; init; } = string.Empty;
    public string EntityId { get; init; } = string.Empty;
    public AuditAction Action { get; init; }
    public string? OldValues { get; init; }
    public string? NewValues { get; init; }
    public string? UserId { get; init; }
    public string? UserName { get; init; }
    public DateTime Timestamp { get; init; }
}
