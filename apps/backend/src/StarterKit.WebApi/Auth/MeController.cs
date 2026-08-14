using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StarterKit.Core.Interfaces;
using StarterKit.Core.Interfaces.Services;
using StarterKit.WebApi.Auth.DTOs;

namespace StarterKit.WebApi.Auth;

[ApiController]
[Route("api/auth")]
[Tags("Auth")]
public sealed class MeController(
    IUserService userService,
    ICurrentSession session,
    IClubService clubService
) : ControllerBase
{
    /// <summary>
    /// Returns the roles assigned to the currently authenticated user,
    /// along with the account's active state (true/false/null).
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(MeResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMe(CancellationToken cancellationToken)
    {
        var roles = User.Claims.Where(c => c.Type == ClaimTypes.Role).Select(c => c.Value).ToList();

        var userId = session.UserIdOrDefault;

        // null  = authenticated via identity provider but no StarterKit DB record yet.
        // true  = active account.
        // false = suspended account.
        bool? isActive = null;
        var hasPortalAccess = false;
        IReadOnlyList<string> permissions = [];

        if (userId is not null)
        {
            var user = await userService.GetByIdAsync(userId.Value, cancellationToken);
            isActive = user.IsActive;
            hasPortalAccess = user.HasPortalAccess;
            permissions =
            [
                .. await userService.GetUserPermissionsAsync(userId.Value, cancellationToken),
            ];
        }

        string? clubName = null;
        string? clubLogoUrl = null;
        var clubId = session.ClubIdOrDefault;
        if (clubId is not null)
        {
            var club = await clubService.FindByIdAsync(clubId.Value, cancellationToken);
            clubName = club?.Name;
            clubLogoUrl = club?.LogoUrl;
        }

        return Ok(
            new MeResponse
            {
                Roles = roles,
                IsActive = isActive,
                HasPortalAccess = hasPortalAccess,
                Permissions = permissions,
                ClubName = clubName,
                ClubId = clubId,
                ClubLogoUrl = clubLogoUrl,
            }
        );
    }
}
