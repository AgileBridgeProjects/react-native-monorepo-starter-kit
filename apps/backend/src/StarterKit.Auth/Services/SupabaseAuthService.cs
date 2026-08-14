using System.Collections.Concurrent;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using StarterKit.Auth.Constants;
using StarterKit.Auth.Interfaces;
using StarterKit.Auth.Options;

namespace StarterKit.Auth.Services;

/// <summary>
/// Validates GoTrue access tokens. Hosted Supabase signs user access tokens with an
/// asymmetric key (ES256/RS256) exposed via the project JWKS, so signing keys are fetched
/// from the OIDC discovery document and cached (with automatic rotation). The shared HS256
/// secret is also accepted as a signing key, which keeps harness-minted tokens (E2E) and any
/// legacy-secret projects working. Issuer / audience / lifetime are always enforced.
/// </summary>
internal sealed class SupabaseAuthService : ISupabaseAuthService
{
    // JWKS config managers are cached per metadata URL so the fetched keys (and their
    // rotation state) persist across this scoped service's per-request instances.
    private static readonly ConcurrentDictionary<
        string,
        ConfigurationManager<OpenIdConnectConfiguration>
    > ConfigManagers = new();

    private readonly ILogger<SupabaseAuthService> _logger;
    private readonly TokenValidationParameters _validationParameters;
    private readonly JwtSecurityTokenHandler _handler = new() { MapInboundClaims = false };

    public SupabaseAuthService(SupabaseOptions options, ILogger<SupabaseAuthService> logger)
    {
        _logger = logger;

        var configManager = ConfigManagers.GetOrAdd(
            $"{options.Issuer}/.well-known/openid-configuration",
            metadataAddress => new ConfigurationManager<OpenIdConnectConfiguration>(
                metadataAddress,
                new OpenIdConnectConfigurationRetriever(),
                new HttpDocumentRetriever
                {
                    RequireHttps = metadataAddress.StartsWith(
                        "https",
                        StringComparison.OrdinalIgnoreCase
                    ),
                }
            )
        );

        // The shared HS256 secret stays valid (E2E synthetic tokens, legacy-secret projects).
        var symmetricKey = string.IsNullOrEmpty(options.JwtSecret)
            ? null
            : new SymmetricSecurityKey(Encoding.UTF8.GetBytes(options.JwtSecret));

        _validationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = options.Issuer,
            ValidateAudience = true,
            ValidAudience = options.Audience,
            ValidateIssuerSigningKey = true,
            // Resolve candidate keys per token: the JWKS keys (asymmetric, by kid) plus the
            // shared HS256 secret. The handler picks the one matching the token's alg/kid.
            IssuerSigningKeyResolver = (_, _, _, _) =>
                ResolveSigningKeys(configManager, symmetricKey),
            // Restrict to the algorithms GoTrue actually uses — never accept "none", and
            // prevent alg-confusion between the EC public keys and the HMAC secret.
            ValidAlgorithms =
            [
                SecurityAlgorithms.EcdsaSha256,
                SecurityAlgorithms.RsaSha256,
                SecurityAlgorithms.HmacSha256,
            ],
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            // GoTrue tokens carry the user id in "sub" and role in "role".
            NameClaimType = SupabaseClaims.Subject,
            RoleClaimType = "role",
        };
    }

    private IEnumerable<SecurityKey> ResolveSigningKeys(
        ConfigurationManager<OpenIdConnectConfiguration> configManager,
        SecurityKey? symmetricKey
    )
    {
        var keys = new List<SecurityKey>();
        try
        {
            // The IssuerSigningKeyResolver callback is synchronous, so we block on the
            // config fetch. Safe here: ASP.NET Core has no SynchronizationContext (no
            // deadlock), and ConfigurationManager serves a cached document after the first
            // call, refreshing on its own schedule.
#pragma warning disable VSTHRD002 // Avoid problematic synchronous waits
            var config = configManager
                .GetConfigurationAsync(CancellationToken.None)
                .GetAwaiter()
                .GetResult();
#pragma warning restore VSTHRD002
            keys.AddRange(config.SigningKeys);
        }
        catch (Exception ex)
        {
            // Network/JWKS failure: fall back to the symmetric key so HS256 tokens still
            // validate and the failure surfaces as a normal invalid-token rejection.
            _logger.LogWarning(ex, "Failed to fetch Supabase JWKS; using symmetric key only");
        }

        if (symmetricKey is not null)
            keys.Add(symmetricKey);

        return keys;
    }

    public SupabaseToken? ValidateToken(string accessToken)
    {
        try
        {
            var principal = _handler.ValidateToken(accessToken, _validationParameters, out _);

            var sub = principal.FindFirstValue(SupabaseClaims.Subject);
            if (string.IsNullOrEmpty(sub))
                return null;

            var email = principal.FindFirstValue(SupabaseClaims.Email);
            var phone = principal.FindFirstValue("phone");
            // GoTrue puts display name in user_metadata; fall back to a top-level "name" if present.
            var name =
                principal.FindFirstValue(SupabaseClaims.Name)
                ?? ReadFromMetadata(principal, "user_metadata", "display_name")
                ?? ReadFromMetadata(principal, "user_metadata", "name");

            // Authorization data lives in app_metadata (server-controlled). Never trust user_metadata.
            var clubId = ReadFromMetadata(
                principal,
                SupabaseClaims.AppMetadata,
                SupabaseClaims.ClubId
            );
            var clubSubdomain = ReadFromMetadata(
                principal,
                SupabaseClaims.AppMetadata,
                SupabaseClaims.ClubSubdomain
            );

            return new SupabaseToken(
                sub,
                email,
                name,
                string.IsNullOrEmpty(phone) ? null : phone,
                clubId,
                clubSubdomain
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Supabase token validation failed");
            return null;
        }
    }

    /// <summary>
    /// Reads a string field from a nested JSON object claim (e.g. <c>app_metadata.club_id</c>).
    /// JwtSecurityTokenHandler serialises object claims as a JSON string.
    /// </summary>
    private static string? ReadFromMetadata(
        ClaimsPrincipal principal,
        string claimType,
        string field
    )
    {
        var raw = principal.FindFirstValue(claimType);
        if (string.IsNullOrEmpty(raw))
            return null;

        try
        {
            using var doc = JsonDocument.Parse(raw);
            if (
                doc.RootElement.ValueKind == JsonValueKind.Object
                && doc.RootElement.TryGetProperty(field, out var value)
                && value.ValueKind == JsonValueKind.String
            )
                return value.GetString();
        }
        catch (JsonException)
        {
            // Malformed metadata — treat as absent.
        }

        return null;
    }
}
