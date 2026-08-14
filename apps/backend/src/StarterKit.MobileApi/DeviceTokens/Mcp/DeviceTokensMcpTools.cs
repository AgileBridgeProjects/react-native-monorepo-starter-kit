using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using ModelContextProtocol.Server;
using StarterKit.Core.Interfaces;
using StarterKit.Data.DeviceTokens.Enums;
using StarterKit.Data.DeviceTokens.Interfaces.Repositories;
using StarterKit.MobileApi.DeviceTokens.DTOs;

namespace StarterKit.MobileApi.DeviceTokens.Mcp;

/// <summary>
/// MCP tools mirroring <see cref="DeviceTokensController"/> 1:1.
/// Injects the repository directly to match the controller's baselined debt
/// (see the thin-controller baseline entry in scripts/check-architecture.mjs).
/// </summary>
[McpServerToolType]
public sealed class DeviceTokensMcpTools(IDeviceTokenRepository repository, ICurrentSession session)
{
    [McpServerTool(Name = "device_tokens_register", Idempotent = true)]
    [Authorize]
    [Description(
        "Registers or updates a device push token for the current user. "
            + "Replaces stale tokens for the same (user, platform) pair."
    )]
    public async Task RegisterAsync(
        RegisterDeviceTokenRequest request,
        CancellationToken cancellationToken = default
    )
    {
        if (!Enum.TryParse<PushPlatform>(request.Platform, ignoreCase: true, out var platform))
            throw new ArgumentException(
                $"Invalid platform '{request.Platform}'. Valid values: {string.Join(", ", Enum.GetNames<PushPlatform>())}"
            );

        await repository.UpsertAsync(session.UserId, platform, request.Token, cancellationToken);
    }
}
