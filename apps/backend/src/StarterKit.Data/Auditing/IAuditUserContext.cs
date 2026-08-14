namespace StarterKit.Data.Auditing;

/// <summary>
/// Provides the acting user ID for audit field population in the EF Core interceptors.
///
/// This interface is intentionally defined in <c>StarterKit.Data</c> rather than
/// <c>StarterKit.Core</c> so that the auditing interceptors can depend on it without
/// creating a circular reference (Core references Data, never the reverse).
///
/// The production implementation (<c>CurrentAuditUserContext</c> in <c>StarterKit.Auth</c>)
/// delegates to <c>ICurrentSession</c>.
/// </summary>
public interface IAuditUserContext
{
    /// <summary>
    /// The ID of the currently authenticated user, or <c>null</c> for background jobs
    /// or unauthenticated requests.
    /// </summary>
    string? UserId { get; }

    /// <summary>
    /// The effective club ID for this request (impersonated club when active,
    /// otherwise the user's own club), or <c>null</c> for background jobs.
    /// Written to <see cref="AuditLog.ClubId"/> so logs are tenant-scoped.
    /// </summary>
    Guid? ClubId { get; }
}
