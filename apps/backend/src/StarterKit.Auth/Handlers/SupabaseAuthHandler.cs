using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StarterKit.Auth.Constants;
using StarterKit.Auth.Interfaces;

namespace StarterKit.Auth.Handlers;

/// <summary>
/// Authenticates requests bearing a Supabase (GoTrue) access token. Signature validation uses
/// the project JWKS (asymmetric, cached) with the shared HS256 secret also accepted; see
/// <see cref="Services.SupabaseAuthService"/>. Emits a flat principal so downstream code reads
/// <c>sub</c> / <c>email</c> / <c>club_id</c> directly; <c>RoleClaimsTransformer</c> then
/// enriches it with the internal user id, roles and permissions.
/// </summary>
public class SupabaseAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly ISupabaseAuthService _supabaseAuthService;

    public SupabaseAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        ISupabaseAuthService supabaseAuthService
    )
        : base(options, logger, encoder)
    {
        _supabaseAuthService = supabaseAuthService;
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        string? accessToken = null;

        if (Request.Headers.TryGetValue("Authorization", out var authHeader))
        {
            var authHeaderValue = authHeader.ToString();
            if (authHeaderValue.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                accessToken = authHeaderValue["Bearer ".Length..].Trim();
        }
        else if (Request.Path.StartsWithSegments("/hubs"))
        {
            // WebSocket connections cannot carry Authorization headers; the SignalR JS client
            // sends the token via the access_token query-string parameter for hub paths.
            var queryToken = Request.Query["access_token"].ToString();
            if (!string.IsNullOrEmpty(queryToken))
                accessToken = queryToken;
        }

        if (string.IsNullOrEmpty(accessToken))
            return Task.FromResult(AuthenticateResult.NoResult());

        var token = _supabaseAuthService.ValidateToken(accessToken);
        if (token is null)
            return Task.FromResult(AuthenticateResult.Fail("Invalid Supabase token"));

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, token.Subject),
            new(SupabaseClaims.Subject, token.Subject),
        };

        if (!string.IsNullOrEmpty(token.Email))
            claims.Add(new Claim(ClaimTypes.Email, token.Email));

        if (!string.IsNullOrEmpty(token.Name))
            claims.Add(new Claim(ClaimTypes.Name, token.Name));

        // Flatten app_metadata.club_id onto the principal so CurrentSession /
        // ClubMemberRequirement / ClaimsPrincipalExtensions read it directly.
        if (!string.IsNullOrEmpty(token.ClubId))
            claims.Add(new Claim(SupabaseClaims.ClubId, token.ClubId));

        if (!string.IsNullOrEmpty(token.ClubSubdomain))
            claims.Add(new Claim(SupabaseClaims.ClubSubdomain, token.ClubSubdomain));

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
