using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using StarterKit.Core.Interfaces;
using StarterKit.Core.Notifications.Interfaces.Services;
using StarterKit.MobileApi.Support.DTOs;
using StarterKit.MobileApi.Support.Options;

namespace StarterKit.MobileApi.Support;

[ApiController]
[Route("api/support")]
[Tags("Support")]
[Authorize]
public sealed class SupportController(
    IEmailSender emailSender,
    IOptions<SupportOptions> supportOptions,
    ICurrentSession currentSession
) : ControllerBase
{
    /// <summary>
    /// Sends a help / support request email to the configured support address on behalf of the
    /// authenticated user. The user's name and email are automatically prepended to the body.
    /// </summary>
    [HttpPost("help")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> SendHelpEmailAsync(
        [FromBody] HelpRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var userLine =
            $"From: {currentSession.DisplayName ?? "Unknown"} <{currentSession.Email ?? "unknown"}>";
        var fullBody = $"{userLine}\n\n{request.Body}";

        await emailSender.SendPlainAsync(
            subject: $"[StarterKit Help] {request.Subject}",
            plainBody: fullBody,
            toEmail: supportOptions.Value.HelpEmail,
            cancellationToken
        );

        return NoContent();
    }
}
