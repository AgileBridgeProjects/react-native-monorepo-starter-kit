using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;
using ModelContextProtocol.Server;
using StarterKit.Core.Interfaces;
using StarterKit.Core.Notifications.Interfaces.Services;
using StarterKit.MobileApi.Support.DTOs;
using StarterKit.MobileApi.Support.Options;

namespace StarterKit.MobileApi.Support.Mcp;

/// <summary>MCP tools mirroring <see cref="SupportController"/> 1:1.</summary>
[McpServerToolType]
public sealed class SupportMcpTools(
    IEmailSender emailSender,
    IOptions<SupportOptions> supportOptions,
    ICurrentSession currentSession
)
{
    [McpServerTool(Name = "support_send_help_email")]
    [Authorize]
    [Description(
        "Sends a help/support request email to the configured support address on behalf of the "
            + "authenticated user. The user's name and email are automatically prepended to the body."
    )]
    public async Task SendHelpEmailAsync(
        HelpRequest request,
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
    }
}
