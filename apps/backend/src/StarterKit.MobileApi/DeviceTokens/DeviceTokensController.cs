using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StarterKit.Core.Interfaces;
using StarterKit.Data.DeviceTokens.Enums;
using StarterKit.Data.DeviceTokens.Interfaces.Repositories;
using StarterKit.MobileApi.DeviceTokens.DTOs;

namespace StarterKit.MobileApi.DeviceTokens;

[ApiController]
[Route("api/device-tokens")]
[Tags("DeviceTokens")]
[Authorize]
public sealed class DeviceTokensController(
    IDeviceTokenRepository repository,
    ICurrentSession session
) : ControllerBase
{
    /// <summary>
    /// Registers or updates a device push token for the current user.
    /// Replaces stale tokens for the same (user, platform) pair.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RegisterAsync(
        [FromBody] RegisterDeviceTokenRequest request,
        CancellationToken cancellationToken = default
    )
    {
        if (!Enum.TryParse<PushPlatform>(request.Platform, ignoreCase: true, out var platform))
            return BadRequest(
                $"Invalid platform '{request.Platform}'. Valid values: {string.Join(", ", Enum.GetNames<PushPlatform>())}"
            );

        await repository.UpsertAsync(session.UserId, platform, request.Token, cancellationToken);
        return NoContent();
    }
}
