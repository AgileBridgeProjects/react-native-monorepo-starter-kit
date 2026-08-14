namespace StarterKit.Data.Persistence;

/// <summary>
/// Provides the tenant <see cref="ClubId"/> for EF Core global query filters.
///
/// This interface is intentionally defined in <c>StarterKit.Data</c> rather than
/// <c>StarterKit.Core</c> so that <c>AppDbContext</c> can depend on it without
/// creating a circular reference (Core references Data, never the reverse).
///
/// The production implementation (<c>CurrentTenantContext</c> in <c>StarterKit.Auth</c>)
/// delegates to <c>ICurrentSession</c>. When no <c>ITenantContext</c> is provided to
/// <c>AppDbContext</c> (e.g. design-time factory, tests, migrator), the context falls
/// back to <c>AppDbContext.NullTenantContext</c> which sets <see cref="IsActive"/> to
/// <c>false</c> and disables all filtering.
/// </summary>
public interface ITenantContext
{
    /// <summary>
    /// Returns the current tenant's <see cref="Guid"/>, or <c>null</c> when no
    /// tenant context is active (e.g. background jobs, unauthenticated requests).
    /// Only read when <see cref="IsActive"/> is <c>true</c>.
    /// </summary>
    Guid? ClubId { get; }

    /// <summary>
    /// Whether tenant filtering should be enforced on this request.
    /// <c>false</c> for background jobs (no HTTP context), unauthenticated requests,
    /// migrator, and test contexts — all rows are visible in those cases.
    /// </summary>
    bool IsActive { get; }
}
