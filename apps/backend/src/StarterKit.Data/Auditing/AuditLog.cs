namespace StarterKit.Data.Auditing;

using StarterKit.Data.Auditing.Enums;

/// <summary>
/// Append-only change-history record written by <see cref="AuditLogInterceptor"/>
/// after every successful SaveChanges for any <see cref="IAuditable"/> entity.
/// Records are immutable — no update or delete operations are permitted through the
/// application (enforced by the absence of update/delete endpoints and repository methods).
/// </summary>
[ExcludeFromAuditLog]
public class AuditLog
{
    public Guid Id { get; set; }

    /// <summary>The EF Core entity type name (e.g. "AiConfiguration").</summary>
    public string EntityName { get; set; } = string.Empty;

    /// <summary>String representation of the primary key value.</summary>
    public string EntityId { get; set; } = string.Empty;

    /// <summary>The operation that triggered this entry.</summary>
    public AuditAction Action { get; set; }

    /// <summary>
    /// JSON object of property values before the change.
    /// Null for Insert operations.
    /// </summary>
    public string? OldValues { get; set; }

    /// <summary>
    /// JSON object of property values after the change.
    /// Null for Delete operations.
    /// </summary>
    public string? NewValues { get; set; }

    /// <summary>
    /// User ID of the actor. Null for background jobs or unauthenticated operations.
    /// </summary>
    public string? UserId { get; set; }

    /// <summary>
    /// The club that owns this audit record. Null for platform-level background jobs.
    /// Used to scope audit log queries per tenant.
    /// </summary>
    public Guid? ClubId { get; set; }

    public DateTime Timestamp { get; set; }
}
