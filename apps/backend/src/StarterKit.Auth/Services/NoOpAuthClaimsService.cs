using Microsoft.Extensions.Logging;
using StarterKit.Core.Interfaces.Services;

namespace StarterKit.Auth.Services;

/// <summary>
/// No-op claims service used when Supabase:Enabled is false (tests / local envs without a
/// Supabase stack). Logs and does nothing.
/// </summary>
internal sealed class NoOpAuthClaimsService(ILogger<NoOpAuthClaimsService> logger)
    : IAuthClaimsService
{
    public Task SetClubClaimAsync(
        string authUserId,
        Guid clubId,
        string? clubSubdomain = null,
        CancellationToken cancellationToken = default
    )
    {
        logger.LogDebug(
            "NoOp SetClubClaim {ClubId} for {Uid} (Supabase disabled)",
            clubId,
            authUserId
        );
        return Task.CompletedTask;
    }

    public Task ClearClubClaimAsync(
        string authUserId,
        CancellationToken cancellationToken = default
    ) => Task.CompletedTask;

    public Task RevokeRefreshTokensAsync(
        string authUserId,
        CancellationToken cancellationToken = default
    ) => Task.CompletedTask;
}
