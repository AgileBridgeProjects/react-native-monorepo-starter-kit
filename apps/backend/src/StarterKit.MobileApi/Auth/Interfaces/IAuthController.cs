using Microsoft.AspNetCore.Mvc;
using StarterKit.MobileApi.Auth.DTOs;

namespace StarterKit.MobileApi.Auth.Interfaces;

public interface IAuthController
{
    Task<ActionResult<MeResponse>> GetMeAsync(CancellationToken cancellationToken = default);
    Task<IActionResult> UpdateDisplayNameAsync(
        UpdateDisplayNameRequest request,
        CancellationToken cancellationToken
    );
    Task<ActionResult<IReadOnlyList<LinkedOrganisationDto>>> GetLinkedOrganisationsAsync(
        CancellationToken cancellationToken
    );
}
