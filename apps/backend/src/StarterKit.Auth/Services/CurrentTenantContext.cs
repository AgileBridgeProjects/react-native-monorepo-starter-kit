using StarterKit.Core.Interfaces;
using StarterKit.Data.Persistence;

namespace StarterKit.Auth.Services;

/// <summary>
/// Bridges <see cref="ICurrentSession"/> (in <c>StarterKit.Core</c>) with
/// <see cref="ITenantContext"/> (in <c>StarterKit.Data</c>) so that
/// <see cref="AppDbContext"/> can apply per-tenant global query filters
/// without introducing a prohibited circular dependency between
/// <c>StarterKit.Data</c> and <c>StarterKit.Core</c>.
///
/// Registered as <b>Scoped</b> — one instance per HTTP request, aligned with
/// both <see cref="ICurrentSession"/> and <see cref="AppDbContext"/>.
/// </summary>
public sealed class CurrentTenantContext : ITenantContext
{
    private readonly ICurrentSession _session;

    public CurrentTenantContext(ICurrentSession session) => _session = session;

    /// <inheritdoc />
    public Guid? ClubId => _session.ClubIdOrDefault;

    /// <inheritdoc />
    /// <remarks>
    /// Returns <c>false</c> for background jobs (Hangfire scopes with no HTTP context),
    /// unauthenticated requests, and Super Admin sessions. Super Admins must be able to
    /// query across all tenants; bypassing the filter here applies universally to every
    /// tenant-scoped entity (Team, Tag, ClubTopic, etc.).
    ///
    /// Exception: when a SuperAdmin is actively impersonating a club the filter is
    /// re-enabled. <see cref="StarterKit.Auth.Services.CurrentSession.ClubIdOrDefault"/> then
    /// returns the impersonated club ID (via <c>ImpersonatedClubId</c>) so EF Core
    /// correctly scopes data to the impersonated tenant.
    /// </remarks>
    public bool IsActive =>
        _session.IsAuthenticated && (!_session.IsSuperAdmin || _session.IsImpersonating);
}
