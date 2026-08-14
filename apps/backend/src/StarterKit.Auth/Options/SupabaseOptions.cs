using System.ComponentModel.DataAnnotations;

namespace StarterKit.Auth.Options;

/// <summary>
/// Configuration for the self-hosted Supabase (GoTrue) auth provider.
/// See <c>docs/standards/supabase.md</c>.
/// </summary>
public sealed class SupabaseOptions
{
    public const string SectionName = "Supabase";

    /// <summary>
    /// When false, JWT validation and the Admin API run in no-op mode (used by tests /
    /// environments without a Supabase stack). Local dev and prod set this true.
    /// </summary>
    public bool Enabled { get; init; } = true;

    /// <summary>
    /// The public external base URL of the auth gateway, as embedded in the token issuer.
    /// The token <c>iss</c> is <c>{ApiExternalUrl}/auth/v1</c> and is validated against it.
    /// e.g. <c>http://localhost:8000</c>.
    /// </summary>
    public string ApiExternalUrl { get; init; } = "http://localhost:8000";

    /// <summary>
    /// The base URL the backend uses to reach GoTrue for server-to-server Admin API calls.
    /// In Docker this is the internal gateway hostname (e.g. <c>http://kong:8000</c>); for a
    /// backend running on the host it matches <see cref="ApiExternalUrl"/>. Falls back to
    /// <see cref="ApiExternalUrl"/> when unset.
    /// </summary>
    public string? InternalUrl { get; init; }

    /// <summary>HS256 signing secret shared with GoTrue (<c>JWT_SECRET</c>). Validates every token.</summary>
    public string JwtSecret { get; init; } = string.Empty;

    /// <summary>Expected token audience. GoTrue uses <c>authenticated</c> for signed-in users.</summary>
    public string Audience { get; init; } = "authenticated";

    /// <summary>Service-role key for the Admin API (create users, set <c>app_metadata</c>). Server-only.</summary>
    public string ServiceRoleKey { get; init; } = string.Empty;

    /// <summary>Anon (publishable) key — sent as the <c>apikey</c> header on Admin API calls.</summary>
    public string AnonKey { get; init; } = string.Empty;

    /// <summary>The token issuer to validate against: <c>{ApiExternalUrl}/auth/v1</c>.</summary>
    public string Issuer => $"{ApiExternalUrl.TrimEnd('/')}/auth/v1";

    /// <summary>Base URL for Admin API calls (<see cref="InternalUrl"/> or <see cref="ApiExternalUrl"/>).</summary>
    public string AdminBaseUrl =>
        (string.IsNullOrWhiteSpace(InternalUrl) ? ApiExternalUrl : InternalUrl).TrimEnd('/');

    /// <summary>Validates required fields when <see cref="Enabled"/> is true.</summary>
    public IEnumerable<ValidationResult> Validate()
    {
        if (!Enabled)
            yield break;

        if (string.IsNullOrWhiteSpace(JwtSecret))
            yield return new ValidationResult(
                "Supabase:JwtSecret is required when Supabase:Enabled is true.",
                [nameof(JwtSecret)]
            );

        if (string.IsNullOrWhiteSpace(ApiExternalUrl))
            yield return new ValidationResult(
                "Supabase:ApiExternalUrl is required when Supabase:Enabled is true.",
                [nameof(ApiExternalUrl)]
            );
    }
}
