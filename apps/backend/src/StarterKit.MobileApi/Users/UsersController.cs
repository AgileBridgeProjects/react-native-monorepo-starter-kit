using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using StarterKit.Auth.RateLimiting;
using StarterKit.Core.Interfaces;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Models;
using StarterKit.Core.Resources;
using StarterKit.Data.Exceptions;
using StarterKit.MobileApi.Users.DTOs;
using StarterKit.MobileApi.Users.Interfaces;
using StarterKit.MobileApi.Users.Mappers;

namespace StarterKit.MobileApi.Users;

[ApiController]
[Route("api/users")]
[Tags("Users")]
[Authorize]
public sealed class UsersController(
    IUserService userService,
    IClubService clubService,
    ICurrentSession currentSession
) : ControllerBase, IUsersController
{
    /// <summary>
    /// Returns the authenticated user's full profile, including a short-lived SAS URL for
    /// the avatar when one has been uploaded.
    /// </summary>
    [HttpGet("me/profile")]
    [ProducesResponseType(typeof(UserProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<UserProfileResponse>> GetProfileAsync(
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

        return Ok(
            new UserProfileResponse(
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
            )
        );
    }

    /// <summary>
    /// Partially updates the authenticated user's profile.
    /// Omit a field to leave it unchanged.
    /// </summary>
    [HttpPatch("me/profile")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UpdateProfileAsync(
        [FromBody] UpdateProfileRequest request,
        CancellationToken cancellationToken = default
    )
    {
        if (request.DisplayName is not null && request.DisplayName.Trim().Length < 2)
        {
            return ValidationProblem(
                new ValidationProblemDetails(
                    new Dictionary<string, string[]>
                    {
                        [nameof(request.DisplayName)] =
                        [
                            "Display name must be at least 2 non-whitespace characters.",
                        ],
                    }
                )
            );
        }

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

        return NoContent();
    }

    /// <summary>
    /// Returns the athletes linked to the authenticated parent, each with the relationship the
    /// parent has declared so far. Read-only — links are created by an admin in the
    /// portal. Empty when the parent has no linked athletes.
    /// </summary>
    [HttpGet("me/linked-athletes")]
    [ProducesResponseType(typeof(IReadOnlyList<LinkedAthleteResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IReadOnlyList<LinkedAthleteResponse>>> ListLinkedAthletesAsync(
        CancellationToken cancellationToken = default
    )
    {
        var athletes = await userService.ListLinkedAthletesAsync(
            currentSession.UserId,
            cancellationToken
        );
        return Ok(athletes.ToResponseList());
    }

    /// <summary>
    /// Records the authenticated parent's relationship to each of their linked athletes, submitted
    /// on the final parent onboarding step. Every athlete in the request must already be
    /// linked to this parent.
    /// </summary>
    [HttpPut("me/linked-athletes/relationships")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> SetGuardianRelationshipsAsync(
        [FromBody] SetLinkedAthleteRelationshipsRequest request,
        CancellationToken cancellationToken = default
    )
    {
        await userService.SetGuardianRelationshipsAsync(
            request.ToCommand(currentSession.UserId),
            cancellationToken
        );

        return NoContent();
    }

    /// <summary>
    /// Returns the teams linked to the authenticated coach. Read-only — links are
    /// created by an admin in the portal. Empty when the coach has no linked teams.
    /// </summary>
    [HttpGet("me/linked-teams")]
    [ProducesResponseType(typeof(IReadOnlyList<LinkedTeamResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IReadOnlyList<LinkedTeamResponse>>> ListLinkedTeamsAsync(
        CancellationToken cancellationToken = default
    )
    {
        var teams = await userService.ListLinkedTeamsAsync(
            currentSession.UserId,
            cancellationToken
        );
        return Ok(teams.ToResponseList());
    }

    /// <summary>
    /// Uploads a new logo image for a team linked to the authenticated coach and persists it
    /// directly on the team, submitted on the coach onboarding linked-teams step.
    /// The team must already be linked to the calling coach. Accepted formats: JPEG, PNG, GIF,
    /// WebP. Maximum size: 10 MiB.
    /// </summary>
    [HttpPost("me/linked-teams/{teamId:guid}/logo")]
    [EnableRateLimiting(RateLimitPolicies.UploadOrImport)]
    [ProducesResponseType(typeof(UploadPhotoResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<UploadPhotoResponse>> UploadLinkedTeamLogoAsync(
        Guid teamId,
        IFormFile file,
        CancellationToken cancellationToken = default
    )
    {
        // Verify the linkage before touching blob storage — otherwise an unauthorized or
        // nonexistent teamId would still leave an orphaned blob behind ahead of the 404.
        await userService.EnsureCoachLinkedToTeamAsync(
            currentSession.UserId,
            teamId,
            cancellationToken
        );

        await using var stream = file.OpenReadStream();
        var (storedPath, url) = await userService.UploadTeamLogoImageAsync(
            teamId,
            new UploadedFile(file.FileName, file.ContentType, file.Length, stream),
            cancellationToken
        );

        await userService.SetLinkedTeamLogoAsync(
            currentSession.UserId,
            teamId,
            storedPath,
            cancellationToken
        );

        return Ok(new UploadPhotoResponse(BlobPath: storedPath, Url: url!));
    }

    /// <summary>
    /// Uploads a new avatar image for the authenticated user and returns the blob path and
    /// a short-lived SAS URL. Use the returned <c>avatarBlobPath</c> in a subsequent
    /// <c>PATCH /api/users/me/profile</c> request to persist the change.
    /// Accepted formats: JPEG, PNG, GIF, WebP. Maximum size: 5 MiB.
    /// </summary>
    [HttpPost("me/avatar")]
    [EnableRateLimiting(RateLimitPolicies.UploadOrImport)]
    [ProducesResponseType(typeof(UploadAvatarResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<UploadAvatarResponse>> UploadAvatarAsync(
        IFormFile file,
        CancellationToken cancellationToken = default
    )
    {
        await using var stream = file.OpenReadStream();
        var (storedPath, url) = await userService.UploadAvatarAsync(
            currentSession.UserId,
            new UploadedFile(file.FileName, file.ContentType, file.Length, stream),
            cancellationToken
        );

        return Ok(new UploadAvatarResponse(AvatarBlobPath: storedPath, AvatarUrl: url!));
    }

    /// <summary>
    /// Uploads the athlete's full-body onboarding photo and returns the blob path and a
    /// short-lived SAS URL. Use the returned <c>blobPath</c> in a subsequent
    /// <c>PATCH /api/users/me/profile</c> request to persist the change.
    /// Accepted formats: JPEG, PNG, GIF, WebP. Maximum size: 10 MiB.
    /// </summary>
    [HttpPost("me/full-body-photo")]
    [EnableRateLimiting(RateLimitPolicies.UploadOrImport)]
    [ProducesResponseType(typeof(UploadPhotoResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<UploadPhotoResponse>> UploadFullBodyPhotoAsync(
        IFormFile file,
        CancellationToken cancellationToken = default
    )
    {
        await using var stream = file.OpenReadStream();
        var (storedPath, url) = await userService.UploadFullBodyPhotoAsync(
            currentSession.UserId,
            new UploadedFile(file.FileName, file.ContentType, file.Length, stream),
            cancellationToken
        );

        return Ok(new UploadPhotoResponse(BlobPath: storedPath, Url: url!));
    }

    /// <summary>
    /// Uploads the athlete's face onboarding photo and returns the blob path and a short-lived
    /// SAS URL. Use the returned <c>blobPath</c> in a subsequent
    /// <c>PATCH /api/users/me/profile</c> request to persist the change.
    /// Accepted formats: JPEG, PNG, GIF, WebP. Maximum size: 10 MiB.
    /// </summary>
    [HttpPost("me/face-photo")]
    [EnableRateLimiting(RateLimitPolicies.UploadOrImport)]
    [ProducesResponseType(typeof(UploadPhotoResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<UploadPhotoResponse>> UploadFacePhotoAsync(
        IFormFile file,
        CancellationToken cancellationToken = default
    )
    {
        await using var stream = file.OpenReadStream();
        var (storedPath, url) = await userService.UploadFacePhotoAsync(
            currentSession.UserId,
            new UploadedFile(file.FileName, file.ContentType, file.Length, stream),
            cancellationToken
        );

        return Ok(new UploadPhotoResponse(BlobPath: storedPath, Url: url!));
    }

    /// <summary>
    /// Changes the authenticated user's password.
    /// Only supported for username/password (CustomAuthentication) accounts.
    /// </summary>
    [HttpPost("me/change-password")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ChangePasswordAsync(
        [FromBody] ChangePasswordRequest request,
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            await userService.ChangePasswordAsync(
                currentSession.UserId,
                request.NewPassword,
                cancellationToken
            );
            return NoContent();
        }
        catch (ArgumentException ex)
        {
            return ValidationProblem(
                new ValidationProblemDetails(
                    new Dictionary<string, string[]>
                    {
                        [nameof(request.NewPassword)] = [ex.Message],
                    }
                )
            );
        }
        catch (ConflictException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }
}
