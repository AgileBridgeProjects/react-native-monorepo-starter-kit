using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using StarterKit.Auth.Attributes;
using StarterKit.Auth.Constants;
using StarterKit.Auth.Permissions;
using StarterKit.Auth.Transformers;

namespace StarterKit.Auth.Middleware;

/// <summary>
/// Reads optional <c>X-Impersonate-Club</c> and <c>X-Impersonate-Team</c> request
/// headers and, when the authenticated user is a SuperAdmin <em>and</em> the matched endpoint
/// is decorated with <see cref="AllowImpersonationAttribute"/>, injects impersonation marker
/// claims (<c>impersonated_club_id</c>, <c>impersonated_team_id</c>,
/// <c>is_impersonating</c>) into the current principal.
/// <see cref="StarterKit.Auth.Services.CurrentSession"/> then prefers these marker claims over the
/// original Firebase <c>club_id</c>/<c>team_id</c> claims whenever
/// <c>is_impersonating</c> is set.
///
/// <para>
/// Endpoints <b>without</b> <see cref="AllowImpersonationAttribute"/> always execute with
/// cross-tenant access — impersonation headers present in the request are silently ignored.
/// </para>
///
/// <para>
/// Registration order: must be placed after <c>UseAuthentication()</c> (so
/// <c>RoleClaimsTransformer</c> has already run and permissions are present) and before
/// <c>UseMiddleware&lt;DisabledUserMiddleware&gt;</c> / <c>UseAuthorization()</c>.
/// </para>
/// </summary>
public sealed class ImpersonationMiddleware(RequestDelegate next)
{
    public const string ClubHeader = "X-Impersonate-Club";
    public const string TeamHeader = "X-Impersonate-Team";

    public async Task InvokeAsync(HttpContext context)
    {
        if (
            context.User.Identity?.IsAuthenticated == true
            && context.User.HasClaim(
                RoleClaimsTransformer.PermissionClaimType,
                StarterKitPermissions.Platform.Admin
            )
            && context.GetEndpoint()?.Metadata.GetMetadata<AllowImpersonationAttribute>()
                is not null
        )
        {
            var clubHeader = context.Request.Headers[ClubHeader].FirstOrDefault();
            var teamHeader = context.Request.Headers[TeamHeader].FirstOrDefault();

            if (!string.IsNullOrWhiteSpace(clubHeader) && Guid.TryParse(clubHeader, out var clubId))
            {
                var additionalClaims = new List<Claim>
                {
                    new(StarterKitClaims.IsImpersonating, "true"),
                    new(StarterKitClaims.ImpersonatedClubId, clubId.ToString()),
                };

                if (
                    !string.IsNullOrWhiteSpace(teamHeader)
                    && Guid.TryParse(teamHeader, out var teamId)
                )
                {
                    additionalClaims.Add(
                        new Claim(StarterKitClaims.ImpersonatedTeamId, teamId.ToString())
                    );
                }

                var impersonationIdentity = new ClaimsIdentity(additionalClaims, "Impersonation");
                context.User.AddIdentity(impersonationIdentity);
            }
        }

        await next(context);
    }
}
