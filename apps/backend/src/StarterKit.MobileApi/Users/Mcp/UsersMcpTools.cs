using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using ModelContextProtocol.Server;
using StarterKit.Core.Interfaces;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Models;
using StarterKit.Data.Exceptions;
using StarterKit.MobileApi.Users.DTOs;
using StarterKit.MobileApi.Users.Mappers;

namespace StarterKit.MobileApi.Users.Mcp;

/// <summary>
/// MCP tools mirroring <see cref="UsersController"/> 1:1.
/// </summary>
[McpServerToolType]
public sealed class UsersMcpTools(
    IUserService userService,
    IClubService clubService,
    ICurrentSession currentSession
)
{
    // Not MCP-exposed: UploadAvatarAsync (POST me/avatar), UploadFullBodyPhotoAsync
    // (POST me/full-body-photo), UploadFacePhotoAsync (POST me/face-photo), and
    // UploadLinkedTeamLogoAsync (POST me/linked-teams/{teamId}/logo) all take an
    // IFormFile multipart upload — binary streams don't map to MCP tool JSON
    // (docs/standards/backend/mcp.md § Excluded from MCP).

    [McpServerTool(Name = "users_get_profile", ReadOnly = true)]
    [Authorize]
    [Description(
        "Returns the authenticated user's full profile, including a short-lived SAS URL for "
            + "the avatar when one has been uploaded."
    )]
    public async Task<UserProfileResponse> GetProfileAsync(
        CancellationToken cancellationToken = default
    )
    {
        var user = await userService.GetProfileAsync(currentSession.UserId, cancellationToken);

        string? clubName = null;
        if (currentSession.ClubIdOrDefault is Guid clubId)
        {
            var club = await clubService.FindByIdAsync(clubId, cancellationToken);
            clubName = club?.Name;
        }

        return new UserProfileResponse(
            Id: user.Id,
            DisplayName: user.DisplayName,
            Email: user.Email,
            AvatarUrl: user.AvatarUrl,
            ClubName: clubName,
            TeamIds: user.TeamIds,
            GamesPlayed: user.GamesPlayed,
            GamesPassed: user.GamesPassed,
            TotalSessions: user.TotalSessions,
            TotalAssignedGames: user.TotalAssignedGames,
            JoinedAt: user.CreatedAt,
            AuthMethod: user.AuthMethod,
            IsCoach: currentSession.IsInRole("Coach"),
            Position: user.Position,
            JerseyNumber: user.JerseyNumber,
            FullBodyPhotoUrl: user.FullBodyPhotoUrl,
            FacePhotoUrl: user.FacePhotoUrl,
            OnboardingCompletedAt: user.OnboardingCompletedAt,
            Roles: user.Roles,
            OnboardingRole: user.OnboardingRole
        );
    }

    [McpServerTool(Name = "users_update_profile", Idempotent = true)]
    [Authorize]
    [Description(
        "Partially updates the authenticated user's profile. Omit a field to leave it unchanged."
    )]
    public async Task UpdateProfileAsync(
        UpdateProfileRequest request,
        CancellationToken cancellationToken = default
    )
    {
        if (request.DisplayName is not null && request.DisplayName.Trim().Length < 2)
            throw new ValidationException(
                "Display name must be at least 2 non-whitespace characters."
            );

        await userService.UpdateProfileAsync(
            new UpdateProfileCommand
            {
                UserId = currentSession.UserId,
                DisplayName = request.DisplayName,
                AvatarBlobPath = request.AvatarBlobPath,
                RemoveAvatar = request.RemoveAvatar,
                Position = request.Position,
                JerseyNumber = request.JerseyNumber,
                FullBodyPhotoBlobPath = request.FullBodyPhotoBlobPath,
                RemoveFullBodyPhoto = request.RemoveFullBodyPhoto,
                FacePhotoBlobPath = request.FacePhotoBlobPath,
                RemoveFacePhoto = request.RemoveFacePhoto,
                CompleteOnboarding = request.CompleteOnboarding,
            },
            cancellationToken
        );
    }

    [McpServerTool(Name = "users_list_linked_athletes", ReadOnly = true)]
    [Authorize]
    [Description(
        "Returns the athletes linked to the authenticated parent, each with the relationship the "
            + "parent has declared so far. Links are created by an admin in the portal, not here."
    )]
    public async Task<IReadOnlyList<LinkedAthleteResponse>> ListLinkedAthletesAsync(
        CancellationToken cancellationToken = default
    )
    {
        var athletes = await userService.ListLinkedAthletesAsync(
            currentSession.UserId,
            cancellationToken
        );
        return athletes.ToResponseList();
    }

    [McpServerTool(Name = "users_set_linked_athlete_relationships", Idempotent = true)]
    [Authorize]
    [Description(
        "Records the authenticated parent's relationship (Mother/Father/Guardian/Other) to each "
            + "of their linked athletes. Every athlete supplied must already be linked to them."
    )]
    public async Task SetGuardianRelationshipsAsync(
        SetLinkedAthleteRelationshipsRequest request,
        CancellationToken cancellationToken = default
    )
    {
        await userService.SetGuardianRelationshipsAsync(
            request.ToCommand(currentSession.UserId),
            cancellationToken
        );
    }

    [McpServerTool(Name = "users_list_linked_teams", ReadOnly = true)]
    [Authorize]
    [Description(
        "Returns the teams linked to the authenticated coach. Links are created by an admin in "
            + "the portal, not here."
    )]
    public async Task<IReadOnlyList<LinkedTeamResponse>> ListLinkedTeamsAsync(
        CancellationToken cancellationToken = default
    )
    {
        var teams = await userService.ListLinkedTeamsAsync(
            currentSession.UserId,
            cancellationToken
        );
        return teams.ToResponseList();
    }

    [McpServerTool(Name = "users_change_password", Idempotent = true)]
    [Authorize]
    [Description(
        "Changes the authenticated user's password. "
            + "Only supported for username/password (CustomAuthentication) accounts."
    )]
    public async Task ChangePasswordAsync(
        ChangePasswordRequest request,
        CancellationToken cancellationToken = default
    )
    {
        await userService.ChangePasswordAsync(
            currentSession.UserId,
            request.NewPassword,
            cancellationToken
        );
    }
}
