using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using StarterKit.Auth.Constants;
using StarterKit.Auth.Permissions;
using StarterKit.Auth.Transformers;

namespace StarterKit.Auth.Authorization;

/// <summary>
/// Requires that the authenticated user's ClubId claim matches the <c>clubId</c>
/// route/query parameter on the current request. This prevents users from accessing
/// resources belonging to other clubs (IDOR / cross-tenant access).
/// </summary>
public sealed class ClubMemberRequirement : IAuthorizationRequirement;

public sealed class ClubMemberHandler : AuthorizationHandler<ClubMemberRequirement>
{
    private readonly ILogger<ClubMemberHandler> _logger;

    public ClubMemberHandler(ILogger<ClubMemberHandler> logger) => _logger = logger;

    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        ClubMemberRequirement requirement
    )
    {
        // SuperAdmins bypass all club-scoping checks — they operate across tenants.
        if (
            context.User.HasClaim(
                RoleClaimsTransformer.PermissionClaimType,
                StarterKitPermissions.Platform.Admin
            )
        )
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        // Resolve the user's effective club using the same priority as CurrentSession:
        // impersonation > org-switch > internal (transformer-resolved) > Supabase JWT claim.
        // Each override branch is gated by its marker claim so an orphan
        // Impersonated/Switched claim cannot take effect without the corresponding
        // IsImpersonating/IsOrgSwitch flag also being set.
        string? userClubId = null;

        if (context.User.HasClaim(StarterKitClaims.IsImpersonating, "true"))
            userClubId = context.User.FindFirst(StarterKitClaims.ImpersonatedClubId)?.Value;

        if (userClubId is null && context.User.HasClaim(StarterKitClaims.IsOrgSwitch, "true"))
        {
            userClubId = context.User.FindFirst(StarterKitClaims.SwitchedClubId)?.Value;
        }

        userClubId ??=
            context.User.FindFirst(StarterKitClaims.InternalClubId)?.Value
            ?? context.User.FindFirst(SupabaseClaims.ClubId)?.Value;

        if (string.IsNullOrEmpty(userClubId))
        {
            _logger.LogDebug("ClubMember check failed: no club claim on principal");
            return Task.CompletedTask;
        }

        // Extract clubId from the request — check route values, query string, then form fields
        string? requestClubId = null;

        if (context.Resource is HttpContext httpContext)
        {
            requestClubId = httpContext.Request.RouteValues.TryGetValue("clubId", out var routeVal)
                ? routeVal?.ToString()
                : httpContext.Request.Query["clubId"].FirstOrDefault();

            // Fall back to form field (e.g. multipart/form-data requests like AiContent generate)
            if (string.IsNullOrEmpty(requestClubId) && httpContext.Request.HasFormContentType)
            {
                requestClubId = httpContext.Request.Form["ClubId"].FirstOrDefault();
            }
        }

        // If no clubId on the request, the requirement is vacuously satisfied
        // (the endpoint doesn't scope by club). Controller-level [Authorize] still applies.
        if (string.IsNullOrEmpty(requestClubId))
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        if (string.Equals(userClubId, requestClubId, StringComparison.OrdinalIgnoreCase))
        {
            context.Succeed(requirement);
        }
        else
        {
            _logger.LogWarning(
                "ClubMember check failed: user club {UserClubId} ≠ request club {RequestClubId}",
                userClubId,
                requestClubId
            );
        }

        return Task.CompletedTask;
    }
}
