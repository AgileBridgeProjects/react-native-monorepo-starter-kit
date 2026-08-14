using System.ComponentModel;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using ModelContextProtocol.Server;
using StarterKit.Core.Interfaces;
using StarterKit.Core.Interfaces.Services;
using StarterKit.WebApi.Auth.DTOs;

namespace StarterKit.WebApi.Auth.Mcp;

/// <summary>MCP tools mirroring <see cref="MeController"/> 1:1.</summary>
[McpServerToolType]
public sealed class MeMcpTools(
    IUserService userService,
    ICurrentSession session,
    IClubService clubService,
    IHttpContextAccessor httpContextAccessor
)
{
    [McpServerTool(Name = "auth_get_me", ReadOnly = true)]
    [Authorize]
    [Description(
        "Returns the roles, permissions, account state and club context of the currently authenticated user."
    )]
    public async Task<MeResponse> GetMe(CancellationToken cancellationToken)
    {
        var principal = httpContextAccessor.HttpContext?.User;
        var roles =
            principal?.Claims.Where(c => c.Type == ClaimTypes.Role).Select(c => c.Value).ToList()
            ?? [];

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

        return new MeResponse
        {
            Roles = roles,
            IsActive = isActive,
            HasPortalAccess = hasPortalAccess,
            Permissions = permissions,
            ClubName = clubName,
            ClubId = clubId,
            ClubLogoUrl = clubLogoUrl,
        };
    }
}
