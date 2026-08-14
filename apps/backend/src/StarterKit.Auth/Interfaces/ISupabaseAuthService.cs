namespace StarterKit.Auth.Interfaces;

/// <summary>Result of validating a Supabase (GoTrue) access token.</summary>
public sealed record SupabaseToken(
    string Subject,
    string? Email,
    string? Name,
    string? Phone,
    string? ClubId,
    string? ClubSubdomain
);

/// <summary>
/// Validates a self-hosted Supabase (GoTrue) access token: signature (HS256 shared secret),
/// issuer, audience and lifetime. Used by <c>SupabaseAuthHandler</c> and dev tooling.
/// </summary>
public interface ISupabaseAuthService
{
    /// <summary>
    /// Validates the token and returns its normalized claims, or <c>null</c> when the token is
    /// missing/invalid/expired. Never throws for an invalid token.
    /// </summary>
    SupabaseToken? ValidateToken(string accessToken);
}
