using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using StarterKit.Auth.Constants;
using StarterKit.Auth.Permissions;
using StarterKit.Auth.Transformers;
using StarterKit.Core.Interfaces;

namespace StarterKit.Auth.Services;

/// <summary>
/// HTTP-context-backed implementation of <see cref="ICurrentSession"/>.
/// Reads per-request claims added by <c>RoleClaimsTransformer</c> (internal user ID, permissions)
/// and Firebase custom claims (club ID, email, display name).
///
/// Registered as <b>Scoped</b> — one instance per HTTP request.
/// </summary>
public sealed class CurrentSession : ICurrentSession
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentSession(IHttpContextAccessor httpContextAccessor) =>
        _httpContextAccessor = httpContextAccessor;

    private ClaimsPrincipal? Principal => _httpContextAccessor.HttpContext?.User;

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated == true;

    public Guid UserId =>
        UserIdOrDefault
        ?? throw new InvalidOperationException(
            "UserId is only available for authenticated requests. "
                + "Ensure the endpoint is protected by [Authorize] and the "
                + "internal_user_id claim has been populated by RoleClaimsTransformer."
        );

    public Guid ClubId =>
        ClubIdOrDefault
        ?? throw new InvalidOperationException(
            "ClubId is only available for authenticated requests. "
                + "Ensure the endpoint is protected by [Authorize] and the "
                + "club_id claim is present on the Firebase token."
        );

    public Guid? UserIdOrDefault
    {
        get
        {
            // Org-switch overrides the user ID to the record in the target club
            if (IsOrgSwitch)
            {
                var switched = Principal?.FindFirstValue(StarterKitClaims.SwitchedUserId);
                if (switched is not null && Guid.TryParse(switched, out var switchedId))
                    return switchedId;
            }

            var value = Principal?.FindFirstValue(StarterKitClaims.InternalUserId);
            return value is not null && Guid.TryParse(value, out var id) ? id : null;
        }
    }

    public Guid? ClubIdOrDefault
    {
        get
        {
            if (IsImpersonating && ImpersonatedClubId.HasValue)
                return ImpersonatedClubId;

            // Org-switch overrides to the selected club
            if (IsOrgSwitch)
            {
                var switched = Principal?.FindFirstValue(StarterKitClaims.SwitchedClubId);
                if (switched is not null && Guid.TryParse(switched, out var switchedId))
                    return switchedId;
            }

            // Prefer the DB-resolved internal claim (set by RoleClaimsTransformer)
            // over the Supabase app_metadata claim which may be stale after a DB reseed.
            var value =
                Principal?.FindFirstValue(StarterKitClaims.InternalClubId)
                ?? Principal?.FindFirstValue(SupabaseClaims.ClubId);
            return value is not null && Guid.TryParse(value, out var id) ? id : null;
        }
    }

    public string? FirebaseUid => Principal?.FindFirstValue(ClaimTypes.NameIdentifier);

    public string? Email => Principal?.FindFirstValue(ClaimTypes.Email);

    public string? DisplayName => Principal?.FindFirstValue(ClaimTypes.Name);

    public Guid? TeamId
    {
        get
        {
            if (IsImpersonating)
                return ImpersonatedTeamId; // null is meaningful: "club-wide"

            if (IsOrgSwitch)
            {
                var switched = Principal?.FindFirstValue(StarterKitClaims.SwitchedTeamId);
                return switched is not null && Guid.TryParse(switched, out var switchedId)
                    ? switchedId
                    : null;
            }

            // Prefer the DB-resolved internal claim over the Supabase claim.
            var value =
                Principal?.FindFirstValue(StarterKitClaims.InternalTeamId)
                ?? Principal?.FindFirstValue(SupabaseClaims.TeamId);
            return value is not null && Guid.TryParse(value, out var id) ? id : null;
        }
    }

    public bool IsInRole(string roleName) => Principal?.IsInRole(roleName) ?? false;

    public bool IsImpersonating =>
        Principal?.HasClaim(StarterKitClaims.IsImpersonating, "true") ?? false;

    public bool IsOrgSwitch => Principal?.HasClaim(StarterKitClaims.IsOrgSwitch, "true") ?? false;

    public Guid? ImpersonatedClubId
    {
        get
        {
            var value = Principal?.FindFirstValue(StarterKitClaims.ImpersonatedClubId);
            return value is not null && Guid.TryParse(value, out var id) ? id : null;
        }
    }

    public Guid? ImpersonatedTeamId
    {
        get
        {
            var value = Principal?.FindFirstValue(StarterKitClaims.ImpersonatedTeamId);
            return value is not null && Guid.TryParse(value, out var id) ? id : null;
        }
    }

    public bool IsSuperAdmin =>
        Principal?.HasClaim(
            RoleClaimsTransformer.PermissionClaimType,
            StarterKitPermissions.Platform.Admin
        ) ?? false;
}
