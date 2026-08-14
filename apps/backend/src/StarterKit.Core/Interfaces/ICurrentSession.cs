namespace StarterKit.Core.Interfaces;

/// <summary>
/// Provides strongly-typed access to the current authenticated user's session details,
/// populated from ASP.NET Core claims. Analogous to ABP's <c>ICurrentUser</c> / <c>ICurrentTenant</c>.
///
/// Inject this into application services and controllers instead of reading claims manually
/// via <c>IHttpContextAccessor</c> or <c>ClaimsPrincipal</c> extension methods.
///
/// Throwing vs. null-safe accessors:
///   - <see cref="UserId"/> / <see cref="ClubId"/> throw <see cref="InvalidOperationException"/>
///     when the user is not authenticated — use in endpoints that are already guarded by [Authorize].
///   - <see cref="UserIdOrDefault"/> / <see cref="ClubIdOrDefault"/> return null — use in
///     code paths that run for both authenticated and anonymous requests.
/// </summary>
public interface ICurrentSession
{
    /// <summary>Whether a user is currently authenticated on this request.</summary>
    bool IsAuthenticated { get; }

    /// <summary>
    /// The authenticated user's internal database <see cref="Guid"/>.
    /// Populated from the <c>internal_user_id</c> claim added by <c>RoleClaimsTransformer</c>.
    /// </summary>
    /// <exception cref="InvalidOperationException">Thrown when the user is not authenticated.</exception>
    Guid UserId { get; }

    /// <summary>
    /// The authenticated user's club <see cref="Guid"/>.
    /// Populated from the <c>club_id</c> Firebase custom claim.
    /// </summary>
    /// <exception cref="InvalidOperationException">Thrown when the user is not authenticated.</exception>
    Guid ClubId { get; }

    /// <summary>Returns <see cref="UserId"/>, or <c>null</c> when not authenticated.</summary>
    Guid? UserIdOrDefault { get; }

    /// <summary>Returns <see cref="ClubId"/>, or <c>null</c> when not authenticated.</summary>
    Guid? ClubIdOrDefault { get; }

    /// <summary>The user's Firebase UID (external auth identifier), or <c>null</c> when not authenticated.</summary>
    string? FirebaseUid { get; }

    /// <summary>The user's email address, or <c>null</c> when not available.</summary>
    string? Email { get; }

    /// <summary>The user's display name, or <c>null</c> when not available.</summary>
    string? DisplayName { get; }

    /// <summary>The authenticated user's team <see cref="Guid"/>, or <c>null</c> when not set.</summary>
    Guid? TeamId { get; }

    /// <summary>
    /// Returns <c>true</c> if the authenticated user is a Super Admin.
    /// Checked by well-known role ID so the platform is not coupled to the role's display name.
    /// </summary>
    bool IsSuperAdmin { get; }

    /// <summary>Returns <c>true</c> if the authenticated user has the specified role.</summary>
    bool IsInRole(string roleName);

    /// <summary>
    /// Returns <c>true</c> when a SuperAdmin has activated impersonation via
    /// <c>X-Impersonate-Club</c> / <c>X-Impersonate-Team</c> request headers.
    /// </summary>
    bool IsImpersonating { get; }

    /// <summary>The impersonated club <see cref="Guid"/>, or <c>null</c> when not impersonating.</summary>
    Guid? ImpersonatedClubId { get; }

    /// <summary>The impersonated team <see cref="Guid"/>, or <c>null</c> when not impersonating or when no team is selected.</summary>
    Guid? ImpersonatedTeamId { get; }

    /// <summary>
    /// Returns <c>true</c> when the user has switched to a different linked
    /// organisation via the <c>X-Active-Org</c> request header.
    /// </summary>
    bool IsOrgSwitch { get; }
}
