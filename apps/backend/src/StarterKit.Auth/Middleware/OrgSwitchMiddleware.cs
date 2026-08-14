using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using StarterKit.Auth.Constants;
using StarterKit.Core.Interfaces.Services;

namespace StarterKit.Auth.Middleware;

/// <summary>
/// Reads the optional <c>X-Active-Org</c> request header and, when the authenticated user
/// has a valid user record in that club, overrides the <c>internal_club_id</c> and
/// <c>internal_user_id</c> claims so the request executes in the context of the switched org.
///
/// This supports users linked to multiple organisations — after login their JWT carries the
/// default club, but the mobile app sends this header once the user picks a different team.
///
/// Registration order: after <see cref="ImpersonationMiddleware"/> so impersonation (SuperAdmin)
/// takes priority over org-switch.
///
/// <para>
/// The middleware is stateless — the target-user lookup hits the DB on every request. This
/// keeps the service horizontally scalable behind a load balancer and ensures that revoking
/// a user from a target club takes effect on the very next request.
/// </para>
/// </summary>
public sealed class OrgSwitchMiddleware(RequestDelegate next, ILogger<OrgSwitchMiddleware> logger)
{
    public const string ActiveOrgHeader = "X-Active-Org";

    private readonly record struct OrgSwitchResolution(Guid UserId, Guid? TeamId);

    public async Task InvokeAsync(HttpContext context, IUserService userService)
    {
        if (!ShouldApplyOrgSwitch(context, out var requestedClubId))
        {
            await next(context);
            return;
        }

        var firebaseUid = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(firebaseUid))
        {
            await next(context);
            return;
        }

        var resolution = await ResolveAsync(
            userService,
            firebaseUid,
            requestedClubId,
            context.RequestAborted
        );

        if (resolution is null)
        {
            logger.LogWarning(
                "Org-switch rejected: no active record in club {ClubId} for uid {FirebaseUid}",
                requestedClubId,
                firebaseUid
            );
            await next(context);
            return;
        }

        ApplyOrgSwitchClaims(context, requestedClubId, resolution.Value);

        logger.LogInformation(
            "Org-switch applied: userId={UserId} → club {ClubId}",
            resolution.Value.UserId,
            requestedClubId
        );

        await next(context);
    }

    private static bool ShouldApplyOrgSwitch(HttpContext context, out Guid requestedClubId)
    {
        requestedClubId = Guid.Empty;

        if (context.User.Identity?.IsAuthenticated != true)
            return false;

        // Impersonation (SuperAdmin) always wins over org-switch.
        if (context.User.HasClaim(StarterKitClaims.IsImpersonating, "true"))
            return false;

        var headerValue = context.Request.Headers[ActiveOrgHeader].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(headerValue))
            return false;

        if (!Guid.TryParse(headerValue, out requestedClubId))
            return false;

        // Fast-path: if the requested club already matches the effective club,
        // skip the DB lookup — the token already represents it.
        var existingClubClaim = context.User.FindFirstValue(StarterKitClaims.InternalClubId);
        if (
            existingClubClaim is not null
            && Guid.TryParse(existingClubClaim, out var currentClubId)
            && currentClubId == requestedClubId
        )
            return false;

        return true;
    }

    private static async Task<OrgSwitchResolution?> ResolveAsync(
        IUserService userService,
        string firebaseUid,
        Guid requestedClubId,
        CancellationToken cancellationToken
    )
    {
        var targetUser = await userService.GetByExternalAuthIdAndClubAsync(
            firebaseUid,
            requestedClubId,
            cancellationToken
        );

        if (targetUser is null || !targetUser.IsActive)
            return null;

        return new OrgSwitchResolution(
            targetUser.Id,
            targetUser.TeamIds.Count > 0 ? targetUser.TeamIds[0] : null
        );
    }

    private static void ApplyOrgSwitchClaims(
        HttpContext context,
        Guid requestedClubId,
        OrgSwitchResolution resolution
    )
    {
        var claims = new List<Claim>
        {
            new(StarterKitClaims.IsOrgSwitch, "true"),
            new(StarterKitClaims.SwitchedClubId, requestedClubId.ToString()),
            new(StarterKitClaims.SwitchedUserId, resolution.UserId.ToString()),
        };

        if (resolution.TeamId.HasValue)
        {
            claims.Add(
                new Claim(StarterKitClaims.SwitchedTeamId, resolution.TeamId.Value.ToString())
            );
        }

        context.User.AddIdentity(new ClaimsIdentity(claims, "OrgSwitch"));
    }
}
