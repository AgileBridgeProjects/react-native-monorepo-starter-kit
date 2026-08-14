using Microsoft.AspNetCore.Mvc;
using StarterKit.MobileApi.Users.DTOs;

namespace StarterKit.MobileApi.Users.Interfaces;

public interface IUsersController
{
    Task<ActionResult<UserProfileResponse>> GetProfileAsync(CancellationToken cancellationToken);

    Task<IActionResult> UpdateProfileAsync(
        [FromBody] UpdateProfileRequest request,
        CancellationToken cancellationToken
    );

    Task<ActionResult<IReadOnlyList<LinkedAthleteResponse>>> ListLinkedAthletesAsync(
        CancellationToken cancellationToken
    );

    Task<IActionResult> SetGuardianRelationshipsAsync(
        [FromBody] SetLinkedAthleteRelationshipsRequest request,
        CancellationToken cancellationToken
    );

    Task<ActionResult<IReadOnlyList<LinkedTeamResponse>>> ListLinkedTeamsAsync(
        CancellationToken cancellationToken
    );

    Task<ActionResult<UploadPhotoResponse>> UploadLinkedTeamLogoAsync(
        Guid teamId,
        IFormFile file,
        CancellationToken cancellationToken
    );

    Task<ActionResult<UploadAvatarResponse>> UploadAvatarAsync(
        IFormFile file,
        CancellationToken cancellationToken
    );

    Task<ActionResult<UploadPhotoResponse>> UploadFullBodyPhotoAsync(
        IFormFile file,
        CancellationToken cancellationToken
    );

    Task<ActionResult<UploadPhotoResponse>> UploadFacePhotoAsync(
        IFormFile file,
        CancellationToken cancellationToken
    );

    Task<IActionResult> ChangePasswordAsync(
        [FromBody] ChangePasswordRequest request,
        CancellationToken cancellationToken
    );
}
