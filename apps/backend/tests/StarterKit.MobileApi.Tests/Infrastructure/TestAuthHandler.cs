using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StarterKit.Auth.Constants;
using StarterKit.Auth.Permissions;

namespace StarterKit.MobileApi.Tests.Infrastructure;

/// <summary>
/// A fake authentication handler for integration tests that authenticates every request.
/// The authenticated user's club ID and internal user ID can be supplied per-request via
/// HTTP headers (set as default headers on the <see cref="HttpClient"/>), making the approach
/// safe for parallel test execution.
///
/// Headers:
///   X-Test-Club-Id          — populates the <c>club_id</c> claim (optional; defaults to Guid.Empty)
///   X-Test-User-Id             — populates the <c>internal_user_id</c> claim (optional; defaults to Guid.Empty)
///   X-Test-No-Internal-User-Id — when present, omits the <c>internal_user_id</c> claim entirely
///                                (simulates a disabled or unregistered user for middleware tests)
///   X-Test-Team-Id       — populates the <c>team_id</c> claim (optional; omitted when not provided)
///   X-Test-Roles         — comma-separated role names turned into <see cref="ClaimTypes.Role"/>
///                          claims (optional; no role claims when absent — matches previous behaviour)
///   X-Test-Permissions   — comma-separated permission names. When absent, ALL permissions are
///                          granted (previous behaviour, which also makes the user a SuperAdmin
///                          and disables tenant query filters). When present, only the listed
///                          permissions are granted — pass an empty value for a plain member
///                          so multitenancy query filters stay active.
/// </summary>
public sealed class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "TestScheme";
    public const string ClubIdHeader = "X-Test-Club-Id";
    public const string UserIdHeader = "X-Test-User-Id";
    public const string NoInternalUserIdHeader = "X-Test-No-Internal-User-Id";
    public const string TeamIdHeader = "X-Test-Team-Id";
    public const string RolesHeader = "X-Test-Roles";
    public const string PermissionsHeader = "X-Test-Permissions";

    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder
    )
        : base(options, logger, encoder) { }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var clubId = Request.Headers.TryGetValue(ClubIdHeader, out var cid)
            ? cid.ToString()
            : Guid.Empty.ToString();

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, "test-firebase-uid"),
            new("club_id", clubId),
        };

        if (!Request.Headers.ContainsKey(NoInternalUserIdHeader))
        {
            var userId = Request.Headers.TryGetValue(UserIdHeader, out var uid)
                ? uid.ToString()
                : Guid.Empty.ToString();
            claims.Add(new Claim(StarterKitClaims.InternalUserId, userId));
        }

        if (
            Request.Headers.TryGetValue(TeamIdHeader, out var did)
            && Guid.TryParse(did.ToString(), out var parsedDid)
        )
            claims.Add(new Claim("team_id", parsedDid.ToString()));

        if (Request.Headers.TryGetValue(RolesHeader, out var roles))
        {
            foreach (
                var role in roles
                    .ToString()
                    .Split(
                        ',',
                        StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries
                    )
            )
                claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var permissions = Request.Headers.TryGetValue(PermissionsHeader, out var permissionValues)
            ? permissionValues
                .ToString()
                .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            : StarterKitPermissions.All;

        foreach (var permission in permissions)
            claims.Add(new Claim("permission", permission));

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
