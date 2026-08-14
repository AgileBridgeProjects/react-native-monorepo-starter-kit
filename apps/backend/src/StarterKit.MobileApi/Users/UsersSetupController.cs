using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using StarterKit.Auth.RateLimiting;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Data.Exceptions;
using StarterKit.MobileApi.Users.DTOs;
using StarterKit.MobileApi.Users.Interfaces;

namespace StarterKit.MobileApi.Users;

/// <summary>
/// Unauthenticated endpoints for the account-setup flow (ABC-123).
/// These endpoints are intentionally anonymous — the one-time token IS the access control.
/// </summary>
[ApiController]
[Route("api/users/setup")]
[Tags("Users")]
[AllowAnonymous]
public sealed class UsersSetupController(IUserService userService, IWebHostEnvironment env)
    : ControllerBase,
        IUsersSetupController
{
    /// <summary>
    /// Validates a setup token and returns the associated email address.
    /// Called when the user opens the setup link from their email.
    /// Returns 404 when the token is not found, expired, or already used.
    /// </summary>
    [HttpGet("validate")]
    [EnableRateLimiting(RateLimitPolicies.SetupValidate)]
    [ProducesResponseType(typeof(ValidateSetupTokenResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<ValidateSetupTokenResponse>> ValidateAsync(
        [FromQuery] string token,
        CancellationToken cancellationToken = default
    )
    {
        if (string.IsNullOrWhiteSpace(token))
            return Problem(
                detail: "Token is required.",
                statusCode: StatusCodes.Status400BadRequest
            );

        try
        {
            var (email, purpose) = await userService.ValidateSetupTokenAsync(
                token,
                cancellationToken
            );
            return Ok(new ValidateSetupTokenResponse { Email = email, Purpose = purpose });
        }
        catch (EntityNotFoundException)
        {
            return Problem(
                detail: "Setup token not found or expired.",
                statusCode: StatusCodes.Status404NotFound
            );
        }
        catch (ArgumentException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
    }

    /// <summary>
    /// Completes the account setup by setting the user's chosen password.
    /// Marks the setup token as used on success.
    /// Returns 400 when the password does not meet complexity requirements or matches the temp password.
    /// Returns 404 when the token is invalid.
    /// </summary>
    [HttpPost("complete")]
    [EnableRateLimiting(RateLimitPolicies.SetupComplete)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> CompleteAsync(
        [FromBody] CompleteSetupRequest request,
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            await userService.CompleteSetupAsync(
                request.Token,
                request.NewPassword,
                cancellationToken
            );
            return NoContent();
        }
        catch (EntityNotFoundException)
        {
            return Problem(
                detail: "Setup token not found or expired.",
                statusCode: StatusCodes.Status404NotFound
            );
        }
        catch (ArgumentException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
        catch (InvalidOperationException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
    }

    /// <summary>
    /// Requests a self-service password reset for the given email address.
    /// Always returns 204 regardless of whether the email exists (OWASP: prevents user enumeration).
    /// In development, returns 200 with the reset link so it can be tested without a real email provider.
    /// </summary>
    [HttpPost("password-reset/request")]
    [EnableRateLimiting(RateLimitPolicies.PasswordResetRequest)]
    [ProducesResponseType(typeof(RequestPasswordResetResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> RequestPasswordResetAsync(
        [FromBody] RequestPasswordResetRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var resetLink = await userService.RequestPasswordResetAsync(
            request.Email,
            returnLinkForDev: env.IsDevelopment(),
            cancellationToken
        );

        // In development only, surface the link so UI-based testing is possible without a
        // real email provider. Never enabled in production (env.IsDevelopment() = false).
        if (env.IsDevelopment() && resetLink is not null)
            return Ok(new RequestPasswordResetResponse { ResetLink = resetLink });

        return NoContent();
    }
}
