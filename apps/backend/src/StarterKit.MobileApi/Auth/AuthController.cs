using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StarterKit.Core.Interfaces;
using StarterKit.Core.Interfaces.Services;
using StarterKit.MobileApi.Auth.DTOs;
using StarterKit.MobileApi.Auth.Interfaces;
using StarterKit.MobileApi.Auth.Mappers;

namespace StarterKit.MobileApi.Auth;

[ApiController]
[Route("api/auth")]
[Tags("Auth")]
[Authorize]
public sealed class AuthController(
    ICurrentSession session,
    IUserService userService,
    IClubService clubService
) : ControllerBase, IAuthController
{
    /// <summary>
    /// Returns the authenticated user's StarterKit club ID, club name and club logo URL.
    /// Used by identity providers that do not embed club context in their tokens
    /// (e.g. Microsoft Entra ID), so the client can populate its auth state after sign-in.
    /// </summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(MeResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<MeResponse>> GetMeAsync(
        CancellationToken cancellationToken = default
    )
    {
        var clubId = session.ClubIdOrDefault;
        if (clubId is null)
            return Problem(
                statusCode: StatusCodes.Status403Forbidden,
                title: "Account not linked",
                detail: "Your account has not been assigned to a club. Contact your administrator."
            );

        var club = await clubService.FindByIdAsync(clubId.Value, cancellationToken);
        var logoUrl = club?.LogoUrl is not null
            ? await clubService.ResolveLogoSasUrlAsync(club.LogoUrl, cancellationToken)
            : null;
        var permissions = await userService.GetUserPermissionsAsync(
            session.UserId,
            cancellationToken
        );

        return Ok(new MeResponse(clubId.Value, club?.Name, logoUrl, permissions.ToList()));
    }

    /// <summary>
    /// Updates the current user's display name. Used by the name-completion interstitial
    /// when a login provider does not supply a name (e.g. phone OTP).
    /// </summary>
    [HttpPatch("me/display-name")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UpdateDisplayNameAsync(
        [FromBody] UpdateDisplayNameRequest request,
        CancellationToken cancellationToken
    )
    {
        var trimmedName = request.DisplayName.Trim();

        if (trimmedName.Length < 2)
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

        await userService.UpdateDisplayNameAsync(session.UserId, trimmedName, cancellationToken);

        return NoContent();
    }

    /// <summary>
    /// Returns all organisations the authenticated user is linked to.
    /// Used by the mobile app's multi-org selection screen.
    /// </summary>
    [HttpGet("me/organisations")]
    [ProducesResponseType(typeof(IReadOnlyList<LinkedOrganisationDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<
        ActionResult<IReadOnlyList<LinkedOrganisationDto>>
    > GetLinkedOrganisationsAsync(CancellationToken cancellationToken)
    {
        var firebaseUid = session.FirebaseUid;
        if (string.IsNullOrEmpty(firebaseUid))
            return Unauthorized();

        var orgs = await userService.GetLinkedOrganisationsAsync(firebaseUid, cancellationToken);
        return Ok(orgs.ToDtoList());
    }
}
