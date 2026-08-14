namespace StarterKit.Auth.Constants;

/// <summary>
/// Claim types added by <c>RoleClaimsTransformer</c> to the authenticated principal
/// that are specific to the StarterKit identity system (not sourced from Firebase or Entra ID).
/// </summary>
public static class StarterKitClaims
{
    /// <summary>The authenticated user's internal database GUID (UUID format).</summary>
    public const string InternalUserId = "internal_user_id";

    /// <summary>
    /// The authenticated user's club GUID, resolved by <c>RoleClaimsTransformer</c>.
    /// Preferred over <c>FirebaseClaims.ClubId</c> because the Firebase token may carry
    /// a stale value after a database reseed.
    /// </summary>
    public const string InternalClubId = "internal_club_id";

    /// <summary>
    /// The authenticated user's team GUID, resolved by <c>RoleClaimsTransformer</c>.
    /// </summary>
    public const string InternalTeamId = "internal_team_id";

    /// <summary>Set by <c>ImpersonationMiddleware</c> when a SuperAdmin is impersonating a club/team.</summary>
    public const string IsImpersonating = "is_impersonating";

    /// <summary>The impersonated club GUID — overrides the principal's own <c>club_id</c> claim.</summary>
    public const string ImpersonatedClubId = "impersonated_club_id";

    /// <summary>The impersonated team GUID — overrides the principal's own <c>team_id</c> claim.</summary>
    public const string ImpersonatedTeamId = "impersonated_team_id";

    /// <summary>Set by <c>OrgSwitchMiddleware</c> when the user has switched to a different linked org.</summary>
    public const string IsOrgSwitch = "is_org_switch";

    // Why separate claims instead of overwriting the internal_* claims?
    // ASP.NET Core ClaimsPrincipal is immutable — middleware can only *add* a new ClaimsIdentity,
    // never modify existing claims. By adding a second identity with "switched_*" claims alongside
    // the original "internal_*" ones, CurrentSession can read both: it uses the switched values
    // when IsOrgSwitch is true, and falls back to the internal values otherwise.
    //
    // Additionally, the user has a *different database record* in the target club (different
    // UserId, potentially different TeamId), so even if overwriting were possible the values
    // would conflict — the internal claims must remain intact to represent the home org.

    /// <summary>
    /// The target club GUID — overrides <c>internal_club_id</c> for the duration of the request.
    /// Differs from <c>InternalClubId</c>: that reflects the user's home org (from the Firebase token);
    /// this reflects the org the user explicitly switched to via the <c>X-Active-Org</c> header.
    /// </summary>
    public const string SwitchedClubId = "switched_club_id";

    /// <summary>
    /// The user's database GUID in the <em>target</em> club — overrides <c>internal_user_id</c>.
    /// A multi-org user has a separate <c>UserEntity</c> row per club, so this GUID is
    /// distinct from <c>InternalUserId</c> (which is the home-club record).
    /// </summary>
    public const string SwitchedUserId = "switched_user_id";

    /// <summary>
    /// The user's team GUID in the target club — overrides <c>internal_team_id</c>.
    /// Absent when the user has no team assignment in the target org.
    /// </summary>
    public const string SwitchedTeamId = "switched_team_id";
}
