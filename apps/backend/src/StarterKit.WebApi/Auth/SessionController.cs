using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StarterKit.Core.Interfaces;
using StarterKit.Core.Interfaces.Services;
using StarterKit.WebApi.Auth.Interfaces;

namespace StarterKit.WebApi.Auth;

[ApiController]
[Route("api/auth")]
[Tags("Auth")]
public sealed class SessionController(IAuthClaimsService authClaimsService, ICurrentSession session)
    : ControllerBase,
        ISessionController
{
    /// <summary>
    /// Requests revocation of the current user's sessions in the auth provider.
    /// Called on explicit logout and password change. Suspension is authoritatively enforced by
    /// <c>DisabledUserMiddleware</c>; see <c>IAuthClaimsService.RevokeRefreshTokensAsync</c>.
    /// </summary>
    [HttpPost("revoke-sessions")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RevokeSessions(CancellationToken cancellationToken)
    {
        var authUserId = session.FirebaseUid;

        if (string.IsNullOrEmpty(authUserId))
            return Unauthorized();

        await authClaimsService.RevokeRefreshTokensAsync(authUserId, cancellationToken);

        return NoContent();
    }
}
