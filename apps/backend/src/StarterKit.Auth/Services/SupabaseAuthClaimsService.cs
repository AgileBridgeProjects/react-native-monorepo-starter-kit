using Microsoft.Extensions.Logging;
using StarterKit.Auth.Constants;
using StarterKit.Core.Interfaces.Services;

namespace StarterKit.Auth.Services;

/// <summary>
/// Writes authorization data to a GoTrue user's <c>app_metadata</c> via the Admin API.
/// GoTrue merges <c>app_metadata</c> on update (provider fields are preserved).
/// </summary>
internal sealed class SupabaseAuthClaimsService(
    GoTrueAdminClient admin,
    ILogger<SupabaseAuthClaimsService> logger
) : IAuthClaimsService
{
    public async Task SetClubClaimAsync(
        string authUserId,
        Guid clubId,
        string? clubSubdomain = null,
        CancellationToken cancellationToken = default
    )
    {
        var appMetadata = new Dictionary<string, object?>
        {
            [SupabaseClaims.ClubId] = clubId.ToString(),
        };

        if (!string.IsNullOrWhiteSpace(clubSubdomain))
            appMetadata[SupabaseClaims.ClubSubdomain] = clubSubdomain;

        await admin.UpdateUserAsync(
            authUserId,
            new UpdateUserRequest { AppMetadata = appMetadata },
            cancellationToken
        );

        logger.LogInformation(
            "Set {Claim}={ClubId} in app_metadata for auth user {Uid}",
            SupabaseClaims.ClubId,
            clubId,
            authUserId
        );
    }

    public async Task ClearClubClaimAsync(
        string authUserId,
        CancellationToken cancellationToken = default
    )
    {
        // Setting keys to null removes them from app_metadata on the GoTrue merge.
        await admin.UpdateUserAsync(
            authUserId,
            new UpdateUserRequest
            {
                AppMetadata = new Dictionary<string, object?>
                {
                    [SupabaseClaims.ClubId] = null,
                    [SupabaseClaims.ClubSubdomain] = null,
                },
            },
            cancellationToken
        );

        logger.LogInformation("Cleared club claim in app_metadata for auth user {Uid}", authUserId);
    }

    public Task RevokeRefreshTokensAsync(
        string authUserId,
        CancellationToken cancellationToken = default
    )
    {
        // This GoTrue version exposes no admin "logout"/session-revoke endpoint, and banning the
        // user would block legitimate reactivation. Suspension is authoritatively enforced by the
        // .NET DisabledUserMiddleware (rejects every request from an inactive user) plus the short
        // access-token lifetime, so this is intentionally a logged no-op. See docs/standards/supabase.md.
        logger.LogDebug(
            "RevokeRefreshTokens requested for auth user {Uid} — enforced by DisabledUserMiddleware + token expiry (no GoTrue session-revoke endpoint)",
            authUserId
        );
        return Task.CompletedTask;
    }
}
