namespace StarterKit.Data.Auditing;

/// <summary>
/// Marks an entity for automatic audit field population by <see cref="AuditInterceptor"/>.
/// The interceptor sets <see cref="CreatedAt"/> / <see cref="CreatedBy"/> on insert and
/// <see cref="UpdatedAt"/> / <see cref="UpdatedBy"/> on every subsequent update.
/// </summary>
public interface IAuditable
{
    DateTime CreatedAt { get; set; }
    DateTime? UpdatedAt { get; set; }
    string? CreatedBy { get; set; }
    string? UpdatedBy { get; set; }
}
