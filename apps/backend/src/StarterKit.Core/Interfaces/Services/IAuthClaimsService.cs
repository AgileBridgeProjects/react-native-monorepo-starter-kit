namespace StarterKit.Core.Interfaces.Services;

/// <summary>
/// Sets and clears authorisation claims on the external auth provider (self-hosted
/// Supabase / GoTrue) server-side, so the mobile and web apps receive the correct
/// authorisation context (club scoping) in their JWT.
/// <para>
/// Provider-neutral by design: the implementation lives in <c>StarterKit.Auth</c> and talks
/// to the GoTrue Admin API. Authorisation data is written to the user's
/// <c>app_metadata</c> (server-controlled), never <c>user_metadata</c> (user-editable).
/// </para>
/// </summary>
public interface IAuthClaimsService
{
    /// <summary>
    /// Sets the <c>club_id</c> and (optionally) <c>club_subdomain</c> values in the
    /// given auth user's <c>app_metadata</c>. Takes effect on the user's next token refresh.
    /// </summary>
    Task SetClubClaimAsync(
        string authUserId,
        Guid clubId,
        string? clubSubdomain = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Clears the <c>club_id</c> value from the given auth user's <c>app_metadata</c>.
    /// </summary>
    Task ClearClubClaimAsync(string authUserId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Best-effort request to invalidate the user's existing sessions after a suspend/
    /// password-change. Note: the authoritative suspension enforcement is the .NET
    /// <c>DisabledUserMiddleware</c> (rejects every request from an inactive user) plus the
    /// short access-token lifetime — this call is defense-in-depth.
    /// </summary>
    Task RevokeRefreshTokensAsync(string authUserId, CancellationToken cancellationToken = default);
}
