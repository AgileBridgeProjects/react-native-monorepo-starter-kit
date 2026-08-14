namespace StarterKit.Auth.Constants;

/// <summary>
/// Claim names read from / written to the Supabase (GoTrue) access token.
/// <para>
/// The handler flattens the nested <c>app_metadata.club_id</c> into a top-level
/// <c>club_id</c> claim on the principal so downstream code (CurrentSession,
/// ClubMemberRequirement, ClaimsPrincipalExtensions) can read it directly.
/// </para>
/// </summary>
public static class SupabaseClaims
{
    /// <summary>GoTrue subject claim — the <c>auth.users.id</c> UUID. Stored as <c>ExternalAuthId</c>.</summary>
    public const string Subject = "sub";

    public const string Email = "email";
    public const string Name = "name";

    /// <summary>Nested object claim holding server-controlled authorization data.</summary>
    public const string AppMetadata = "app_metadata";

    /// <summary>Club scope — lives inside <c>app_metadata</c>, flattened onto the principal.</summary>
    public const string ClubId = "club_id";

    /// <summary>Club subdomain — lives inside <c>app_metadata</c>, flattened onto the principal.</summary>
    public const string ClubSubdomain = "club_subdomain";

    /// <summary>Set by <c>RoleClaimsTransformer</c> from the user's TeamId.</summary>
    public const string TeamId = "team_id";
}
