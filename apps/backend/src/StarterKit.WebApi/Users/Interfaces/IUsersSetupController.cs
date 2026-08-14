using Microsoft.AspNetCore.Mvc;
using StarterKit.WebApi.Users.DTOs;

namespace StarterKit.WebApi.Users.Interfaces;

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
