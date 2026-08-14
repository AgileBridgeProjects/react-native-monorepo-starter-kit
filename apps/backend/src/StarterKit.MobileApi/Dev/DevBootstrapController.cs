using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using StarterKit.Auth.Dev;

namespace StarterKit.MobileApi.Dev;

/// <summary>
/// Development-only endpoints for bootstrapping mobile auth accounts.
/// These routes are available only in the Development environment.
/// </summary>
[ApiController]
[Route("api/dev")]
[Tags("Dev")]
[AllowAnonymous]
[DisableRateLimiting]
public sealed class DevBootstrapController(
    IDevBootstrapService devBootstrapService,
    IWebHostEnvironment env
) : ControllerBase
{
    /// <summary>
    /// Links the authenticated Firebase phone-auth account to the StarterKit dev club.
    /// The fixed Firebase test number <c>+27123456789</c> maps to the seeded Test Player row.
    /// </summary>
    [HttpPost("bootstrap-phone")]
    [RequiresBearerToken]
    [ProducesResponseType(typeof(BootstrapPhoneResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> BootstrapPhoneAsync(CancellationToken cancellationToken)
    {
        if (!env.IsDevelopment())
            return Forbid();

        if (!Request.Headers.TryGetValue("Authorization", out var authHeader))
            return BadRequest("Authorization header with Firebase ID token required.");

        var headerValue = authHeader.ToString();
        if (!headerValue.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Authorization header must be 'Bearer <firebase-id-token>'.");

        var idToken = headerValue["Bearer ".Length..].Trim();
        var result = await devBootstrapService.BootstrapPhoneUserAsync(idToken, cancellationToken);

        return Ok(
            new BootstrapPhoneResponse
            {
                UserId = result.UserId,
                ClubId = result.ClubId,
                Message =
                    "Phone user bootstrapped. Force-refresh the Firebase token to get the club_id claim.",
            }
        );
    }

    public sealed class BootstrapPhoneResponse
    {
        public Guid UserId { get; init; }
        public Guid ClubId { get; init; }
        public string Message { get; init; } = string.Empty;
    }
}
