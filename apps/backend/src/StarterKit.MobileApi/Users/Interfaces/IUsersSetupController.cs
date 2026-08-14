using Microsoft.AspNetCore.Mvc;
using StarterKit.MobileApi.Users.DTOs;

namespace StarterKit.MobileApi.Users.Interfaces;

public interface IUsersSetupController
{
    Task<ActionResult<ValidateSetupTokenResponse>> ValidateAsync(
        string token,
        CancellationToken cancellationToken
    );

    Task<IActionResult> CompleteAsync(
        CompleteSetupRequest request,
        CancellationToken cancellationToken
    );

    Task<IActionResult> RequestPasswordResetAsync(
        RequestPasswordResetRequest request,
        CancellationToken cancellationToken
    );
}
