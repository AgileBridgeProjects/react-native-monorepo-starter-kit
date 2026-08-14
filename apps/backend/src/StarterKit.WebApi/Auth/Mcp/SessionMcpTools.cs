using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using ModelContextProtocol.Server;
using StarterKit.Core.Interfaces;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Data.Exceptions;

namespace StarterKit.WebApi.Auth.Mcp;

/// <summary>MCP tools mirroring <see cref="SessionController"/> 1:1.</summary>
[McpServerToolType]
public sealed class SessionMcpTools(IAuthClaimsService authClaimsService, ICurrentSession session)
{
    [McpServerTool(Name = "auth_revoke_sessions", Idempotent = true)]
    [Authorize]
    [Description(
        "Requests revocation of the current user's sessions in the auth provider. Used on explicit logout and password change."
    )]
    public async Task RevokeSessions(CancellationToken cancellationToken)
    {
        var authUserId = session.FirebaseUid;

        // ValidationException (not a bare InvalidOperationException) so the shared
        // DomainExceptionFilter surfaces this as a descriptive tool error. Same error code
        // MobileApi's AuthMcpTools uses for the identical missing-identity condition.
        if (string.IsNullOrEmpty(authUserId))
            throw new ValidationException(
                "The current session has no auth-provider user id, so sessions cannot be revoked.",
                "no-external-identity"
            );

        await authClaimsService.RevokeRefreshTokensAsync(authUserId, cancellationToken);
    }
}
