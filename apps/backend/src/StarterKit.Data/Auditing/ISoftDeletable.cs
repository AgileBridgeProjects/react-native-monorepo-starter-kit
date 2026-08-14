namespace StarterKit.Data.Auditing;

/// <summary>
/// Marks an entity for soft-delete support. Instead of physical removal, the
/// <see cref="AuditInterceptor"/> sets <see cref="IsDeleted"/> = <c>true</c>,
/// <see cref="DeletedAt"/>, and <see cref="DeletedBy"/> when the entity is deleted.
/// A global EF Core query filter excludes all soft-deleted rows from standard queries.
/// </summary>
public interface ISoftDeletable
{
    bool IsDeleted { get; set; }
    DateTime? DeletedAt { get; set; }

    string? DeletedBy { get; set; }
}
