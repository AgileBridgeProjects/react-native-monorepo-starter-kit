using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using StarterKit.Auth.Constants;
using StarterKit.Core.Interfaces.Services;

namespace StarterKit.Auth.Transformers;

/// <summary>
/// Enriches the authenticated principal with the internal user id, club, team, roles
/// and permissions resolved from the database, keyed by the Supabase <c>sub</c> (stored as
/// <c>UserEntity.ExternalAuthId</c>). Pre-registration model: users must be created by an admin
/// before they can sign in — a valid GoTrue token alone never creates a StarterKit user.
/// </summary>
public class RoleClaimsTransformer : IClaimsTransformation
{
    public const string PermissionClaimType = "permission";

    private readonly IUserService _userService;
    private readonly IAuthClaimsService _authClaimsService;
    private readonly ILogger<RoleClaimsTransformer> _logger;

    public RoleClaimsTransformer(
        IUserService userService,
        IAuthClaimsService authClaimsService,
        ILogger<RoleClaimsTransformer> logger
    )
    {
        _userService = userService;
        _authClaimsService = authClaimsService;
        _logger = logger;
    }

    public async Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        if (principal.Identity?.IsAuthenticated != true)
            return principal;

        // Already transformed this principal (ASP.NET Core may call this more than once)
        if (principal.FindFirstValue(StarterKitClaims.InternalUserId) != null)
            return principal;

        // The Supabase subject (sub) is emitted as NameIdentifier by SupabaseAuthHandler.
        var externalAuthId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(externalAuthId))
            return principal;

        var email =
            principal.FindFirstValue(ClaimTypes.Email)
            ?? principal.FindFirstValue(SupabaseClaims.Email)
            ?? string.Empty;
        var displayName =
            principal.FindFirstValue(ClaimTypes.Name)
            ?? principal.FindFirstValue(SupabaseClaims.Name)
            ?? principal.Identity?.Name
            ?? string.Empty;

        var enriched = new ClaimsIdentity();

        try
        {
            // Step 1: look up the user — never auto-create. Resolve by the stable sub first,
            // then fall back to email for the first sign-in after admin pre-registration (before
            // the ExternalAuthId has been linked).
            var user = await _userService.GetByExternalAuthIdAsync(externalAuthId);

            if (user is null && !string.IsNullOrEmpty(email))
                user = await _userService.GetByEmailAsync(email);

            if (user is null)
            {
                _logger.LogWarning(
                    "Sign-in rejected: no pre-registered user found for external auth ID {ExternalAuthId} (email={Email})",
                    externalAuthId,
                    email
                );
                return principal;
            }

            // Link the external auth ID on first sign-in (email pre-registration path).
            // Guard against DbUpdateConcurrencyException: two parallel first-sign-in requests may
            // both attempt this — the loser sees a stale RowVersion and throws, which is harmless
            // because the winner already linked the correct sub.
            if (user.ExternalAuthId != externalAuthId)
            {
                try
                {
                    await _userService.UpdateExternalAuthIdAsync(user.Id, externalAuthId);
                }
                catch (Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException ex)
                {
                    _logger.LogDebug(
                        ex,
                        "Concurrent ExternalAuthId link for user {UserId} — another request already linked {ExternalAuthId}",
                        user.Id,
                        externalAuthId
                    );
                }

                // Mirror the club scope into GoTrue app_metadata so subsequent JWTs carry
                // club_id and skip the email-fallback path. Best-effort — a failure here just
                // means the next sign-in hits the email fallback again.
                try
                {
                    await _authClaimsService.SetClubClaimAsync(externalAuthId, user.ClubId);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(
                        ex,
                        "Failed to set club claim in app_metadata for auth user {ExternalAuthId} — will hit email fallback next sign-in",
                        externalAuthId
                    );
                }
            }

            // Step 1a: refuse claim enrichment for suspended users. Without enrichment the
            // principal carries no internal_user_id / role / permission claims, so every
            // [Authorize] policy fails — effectively blocking sign-in.
            if (!user.IsActive)
            {
                _logger.LogWarning(
                    "Sign-in rejected: user {UserId} is suspended (IsActive=false)",
                    user.Id
                );
                return principal;
            }

            // Best-effort LastLoginAt update — losing it is harmless, losing permissions causes 403s.
            try
            {
                await _userService.UpdateLastLoginAsync(user.Id);
            }
            catch (Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException ex)
            {
                _logger.LogDebug(
                    ex,
                    "Concurrency conflict updating LastLoginAt for user {UserId} — skipping",
                    user.Id
                );
            }

            enriched.AddClaim(new Claim(StarterKitClaims.InternalUserId, user.Id.ToString()));

            // Use internal claim names so a stale app_metadata club_id never shadows the
            // DB-resolved value (e.g. after a database reseed).
            enriched.AddClaim(new Claim(StarterKitClaims.InternalClubId, user.ClubId.ToString()));

            if (user.TeamIds.Count > 0)
                enriched.AddClaim(
                    new Claim(StarterKitClaims.InternalTeamId, user.TeamIds[0].ToString())
                );

            // Load roles and their permissions.
            var roles = await _userService.GetUserRolesAsync(user.Id);
            foreach (var role in roles)
                enriched.AddClaim(new Claim(ClaimTypes.Role, role.Name));

            var permissions = await _userService.GetUserPermissionsAsync(user.Id);
            foreach (var permission in permissions)
                enriched.AddClaim(new Claim(PermissionClaimType, permission));
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to sync/enrich claims for external auth ID {ExternalAuthId}",
                externalAuthId
            );

            // Return the original principal — authorization policies will reject it if they
            // require internal_user_id or roles.
            return principal;
        }

        principal.AddIdentity(enriched);
        return principal;
    }
}
