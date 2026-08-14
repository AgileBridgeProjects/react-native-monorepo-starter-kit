namespace StarterKit.WebApi.Auth.DTOs;

/// <summary>Response returned by GET /api/auth/me.</summary>
public sealed record MeResponse
{
    /// <summary>Role names assigned to the authenticated user.</summary>
    public required IReadOnlyList<string> Roles { get; init; }

    /// <summary>
    /// True = active, false = suspended, null = no StarterKit DB record found
    /// (authenticated via identity provider but not yet provisioned).
    /// </summary>
    public required bool? IsActive { get; init; }

    /// <summary>True when the user holds at least one role flagged as a portal role.</summary>
    public bool HasPortalAccess { get; init; }

    /// <summary>
    /// The resolved permission set for this user — the union of all permissions
    /// granted by their assigned roles. Empty when no StarterKit DB record exists.
    /// </summary>
    public IReadOnlyList<string> Permissions { get; init; } = [];

    /// <summary>
    /// Display name of the club the authenticated user belongs to.
    /// Null when the user has no club claim or the club cannot be found.
    /// </summary>
    public string? ClubName { get; init; }

    /// <summary>
    /// Effective club ID resolved from the authenticated session claims.
    /// Null when no club is attached to the session.
    /// </summary>
    public Guid? ClubId { get; init; }

    /// <summary>
    /// Logo URL for the user's club. Null when no logo has been uploaded.
    /// </summary>
    public string? ClubLogoUrl { get; init; }
}
