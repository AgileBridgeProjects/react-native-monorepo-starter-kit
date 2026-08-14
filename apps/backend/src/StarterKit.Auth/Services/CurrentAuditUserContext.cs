using StarterKit.Core.Interfaces;
using StarterKit.Data.Auditing;

namespace StarterKit.Auth.Services;

/// <summary>
/// Bridges <see cref="ICurrentSession"/> (in <c>StarterKit.Core</c>) with
/// <see cref="IAuditUserContext"/> (in <c>StarterKit.Data</c>) so that the EF Core
/// auditing interceptors can access the current user ID without introducing a
/// circular dependency between <c>StarterKit.Data</c> and <c>StarterKit.Core</c>.
///
/// Registered as <b>Scoped</b> — one instance per HTTP request.
/// </summary>
public sealed class CurrentAuditUserContext : IAuditUserContext
{
    private readonly ICurrentSession _session;

    public CurrentAuditUserContext(ICurrentSession session) => _session = session;

    /// <inheritdoc />
    public string? UserId => _session.UserIdOrDefault?.ToString();

    /// <inheritdoc />
    public Guid? ClubId => _session.ImpersonatedClubId ?? _session.ClubIdOrDefault;
}
