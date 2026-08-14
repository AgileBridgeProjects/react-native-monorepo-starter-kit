using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using ModelContextProtocol.Server;
using StarterKit.Core.Interfaces;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Data.Exceptions;
using StarterKit.MobileApi.Auth.DTOs;
using StarterKit.MobileApi.Auth.Mappers;

namespace StarterKit.MobileApi.Auth.Mcp;

/// <summary>MCP tools mirroring <see cref="AuthController"/> 1:1.</summary>
[McpServerToolType]
public sealed class AuthMcpTools(
    ICurrentSession session,
    IUserService userService,
    IClubService clubService
)
{
    [McpServerTool(Name = "auth_get_me", ReadOnly = true)]
    [Authorize]
    [Description(
        "Returns the authenticated user's StarterKit club ID, club name and club logo URL. "
            + "Used to populate auth state when the identity provider does not embed club context."
    )]
    public async Task<MeResponse> GetMeAsync(CancellationToken cancellationToken = default)
    {
        var clubId = session.ClubIdOrDefault;
        if (clubId is null)
            throw new ValidationException(
                "Your account has not been assigned to a club. Contact your administrator.",
                "account-not-linked"
            );

        var club = await clubService.FindByIdAsync(clubId.Value, cancellationToken);
        var logoUrl = club?.LogoUrl is not null
            ? await clubService.ResolveLogoSasUrlAsync(club.LogoUrl, cancellationToken)
            : null;
        var permissions = await userService.GetUserPermissionsAsync(
            session.UserId,
            cancellationToken
        );

        return new MeResponse(clubId.Value, club?.Name, logoUrl, permissions.ToList());
    }

    [McpServerTool(Name = "auth_update_display_name", Idempotent = true)]
    [Authorize]
    [Description(
        "Updates the current user's display name. Used when a login provider does not supply a name."
    )]
    public async Task UpdateDisplayNameAsync(
        UpdateDisplayNameRequest request,
        CancellationToken cancellationToken
    )
    {
        var trimmedName = request.DisplayName.Trim();

        if (trimmedName.Length < 2)
            throw new ValidationException(
                "Display name must be at least 2 non-whitespace characters."
            );

        await userService.UpdateDisplayNameAsync(session.UserId, trimmedName, cancellationToken);
    }

    [McpServerTool(Name = "auth_get_linked_organisations", ReadOnly = true)]
    [Authorize]
    [Description(
        "Returns all organisations the authenticated user is linked to. "
            + "Used for multi-organisation selection."
    )]
    public async Task<IReadOnlyList<LinkedOrganisationDto>> GetLinkedOrganisationsAsync(
        CancellationToken cancellationToken
    )
    {
        var firebaseUid = session.FirebaseUid;
        if (string.IsNullOrEmpty(firebaseUid))
            throw new ValidationException(
                "The current session has no external identity, so linked organisations are unavailable.",
                "no-external-identity"
            );

        var orgs = await userService.GetLinkedOrganisationsAsync(firebaseUid, cancellationToken);
        return orgs.ToDtoList();
    }
}
