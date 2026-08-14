using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StarterKit.Auth.Constants;
using StarterKit.Auth.Permissions;

namespace StarterKit.WebApi.Tests.Infrastructure;

/// <summary>
/// A fake authentication handler for WebApi integration tests that authenticates every request.
/// The authenticated user's club ID and internal user ID can be supplied per-request via
/// HTTP headers (set as default headers on the <see cref="HttpClient"/>), making the approach
/// safe for parallel test execution.
///
/// Headers:
///   X-Test-Club-Id          — populates the <c>club_id</c> claim (optional; defaults to Guid.Empty)
///   X-Test-User-Id             — populates the <c>internal_user_id</c> claim (optional; defaults to Guid.Empty)
///   X-Test-No-Internal-User-Id — when present, omits the <c>internal_user_id</c> claim entirely
///                                (simulates a disabled or unregistered user for middleware tests)
///   X-Test-Firebase-Uid        — populates the <c>user_id</c> (Firebase) claim (optional; omitted when absent)
///   X-Test-Ms-Oid              — populates the <c>oid</c> (Microsoft Entra) claim (optional; omitted when absent)
///   X-Test-Permissions         — comma-separated list of permissions that overrides the default full set;
///                                use to test 403 scenarios for endpoints gated by restricted policies.
/// </summary>
public sealed class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "TestScheme";
    public const string ClubIdHeader = "X-Test-Club-Id";
    public const string UserIdHeader = "X-Test-User-Id";
    public const string NoInternalUserIdHeader = "X-Test-No-Internal-User-Id";
    public const string FirebaseUidHeader = "X-Test-Firebase-Uid";
    public const string MsOidHeader = "X-Test-Ms-Oid";

    /// <summary>
    /// When present, overrides the default full permission set with a comma-separated list
    /// of specific permissions. Use this to test 403 scenarios where only a subset of
    /// permissions should be granted (e.g., "StarterKit.Reports.View" without "StarterKit.Reports.Manage").
    /// </summary>
    public const string PermissionsHeader = "X-Test-Permissions";

    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder
    )
        : base(options, logger, encoder) { }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, "test-b2c-uid") };

        if (Request.Headers.TryGetValue(ClubIdHeader, out var cid))
            claims.Add(new Claim("club_id", cid.ToString()));

        if (!Request.Headers.ContainsKey(NoInternalUserIdHeader))
        {
            var userId = Request.Headers.TryGetValue(UserIdHeader, out var uid)
                ? uid.ToString()
                : Guid.Empty.ToString();
            claims.Add(new Claim(StarterKitClaims.InternalUserId, userId));
        }

        if (Request.Headers.TryGetValue(FirebaseUidHeader, out var fbUid))
            claims.Add(new Claim("user_id", fbUid.ToString()));

        if (Request.Headers.TryGetValue(MsOidHeader, out var msOid))
            claims.Add(new Claim("oid", msOid.ToString()));

        var permissions = Request.Headers.TryGetValue(PermissionsHeader, out var permsHeader)
            ? permsHeader
                .ToString()
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            : (IEnumerable<string>)StarterKitPermissions.All;

        foreach (var permission in permissions)
            claims.Add(new Claim("permission", permission));

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
