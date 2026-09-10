using StarterKit.Data.Persistence.Entities;
using StarterKit.Data.Teams.Models;
using StarterKit.Data.Users.Enums;
using StarterKit.Data.Users.Models;

namespace StarterKit.Data.Users.Interfaces.Repositories;

/// <summary>
/// <para>
/// Invariant for every method whose result is mapped with <c>UserMapper.ToModel()</c>: it eagerly
/// loads both <c>UserRoles</c> and <c>UserTeams</c>, because <c>ToModel()</c> projects
/// <c>User.Roles</c> and <c>User.TeamIds</c> from those navigations and there is no lazy loading.
/// A method that omits either include silently yields an empty list rather than failing, so any new
/// query whose result gets mapped must include both. Methods that return a bare
/// <see cref="UserEntity"/> for a purpose other than <c>ToModel()</c> mapping — e.g.
/// <see cref="FindByUsernameAsync"/>, <see cref="ListAthletesByTeamAsync"/>,
/// <see cref="FindAllByExternalAuthIdAsync"/> — are exempt.
/// </para>
/// <para>
/// The <c>UserTeams</c> includes are filtered on <c>!IsDeleted</c> even though a global query filter
/// already excludes removed memberships — several of these lookups are cross-tenant and call
/// <c>IgnoreQueryFilters()</c>, which switches that global filter off for the whole query.
/// </para>
/// </summary>
public interface IUserRepository
{
    Task<(IReadOnlyList<UserEntity> Items, int TotalCount)> ListAsync(
        UserFilter filter,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Returns all users matching <paramref name="filter"/> without any page size cap.
    /// Use only for full-dataset operations such as Excel export.
    /// </summary>
    Task<IReadOnlyList<UserEntity>> ListForExportAsync(
        UserFilter filter,
        CancellationToken cancellationToken
    );

    Task<UserEntity?> FindByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Returns the user with roles included, or null.</summary>
    Task<UserEntity?> FindByIdWithRolesAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>
    /// Returns the user with roles included, bypassing the multi-tenancy query filter.
    /// Use ONLY for explicit cross-tenant operations such as multi-org linking.
    /// </summary>
    Task<UserEntity?> FindByIdWithRolesAcrossTenantsAsync(
        Guid id,
        CancellationToken cancellationToken
    );

    Task<UserEntity?> FindByExternalAuthIdAsync(
        string externalAuthId,
        CancellationToken cancellationToken
    );

    Task<UserEntity?> FindByExternalAuthIdAndClubAsync(
        string externalAuthId,
        Guid clubId,
        CancellationToken cancellationToken
    );

    Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken);

    Task<UserEntity> CreateAsync(UserEntity entity, CancellationToken cancellationToken);

    Task UpdateLastLoginAsync(Guid userId, CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);

    Task SetActiveAsync(Guid userId, bool isActive, CancellationToken cancellationToken);

    Task<UserEntity?> FindByEmailAsync(string email, CancellationToken cancellationToken);

    Task<UserEntity?> FindByPhoneAsync(string phoneNumber, CancellationToken cancellationToken);

    /// <summary>Returns the user matching the given username (CustomAuthentication only), or null.</summary>
    Task<UserEntity?> FindByUsernameAsync(string username, CancellationToken cancellationToken);

    /// <summary>Returns the count of active, non-deleted users for the given club.</summary>
    Task<int> CountActiveByClubAsync(Guid clubId, CancellationToken cancellationToken);

    Task UpdateExternalAuthIdAsync(
        Guid userId,
        string externalAuthId,
        CancellationToken cancellationToken
    );

    /// <summary>Soft-deletes a user (marks IsDeleted via the AuditInterceptor).</summary>
    Task DeleteAsync(Guid userId, CancellationToken cancellationToken);

    /// <summary>
    /// Returns the IDs of all active, non-deleted users in the specified team.
    /// Used for eager-assigning games when a game is shared to a team.
    /// </summary>
    Task<IReadOnlyList<Guid>> ListActiveUserIdsByTeamAsync(
        Guid teamId,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Returns the roster of Athlete-role users linked to the given team via <see cref="UserTeam"/>.
    /// Used to match imported stat rows to roster athletes by name.
    /// </summary>
    Task<IReadOnlyList<UserEntity>> ListAthletesByTeamAsync(
        Guid teamId,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// The roster of Athlete-role users across every one of <paramref name="teamIds"/>, each
    /// tagged with the team it was found on — a multi-team roster screen
    ///, so a Coach with several teams sees every athlete they coach in one
    /// list, one row per team membership.
    /// </summary>
    Task<IReadOnlyList<AthleteTeamMembership>> ListAthletesByTeamsAsync(
        IReadOnlyList<Guid> teamIds,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Returns the IDs of all active, non-deleted users across the specified teams.
    /// Used for bulk-assigning games when a game is synced to multiple teams at once.
    /// </summary>
    Task<IReadOnlyList<Guid>> ListActiveUserIdsByTeamsAsync(
        IReadOnlyList<Guid> teamIds,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Returns true when the user's ExternalAuthId is shared by records in more than one club
    /// (i.e. the user has been linked to multiple organisations).
    /// </summary>
    Task<bool> IsSharedAcrossClubsAsync(Guid userId, CancellationToken cancellationToken);

    /// <summary>
    /// Given a collection of ExternalAuthIds, returns the subset that appear in records
    /// belonging to more than one club. Used to batch-flag shared users in list queries.
    /// </summary>
    Task<IReadOnlySet<string>> GetSharedExternalAuthIdsAsync(
        IEnumerable<string> externalAuthIds,
        CancellationToken cancellationToken
    );

    /// <summary>Persists a new avatar blob path on the user record.</summary>
    Task UpdateAvatarUrlAsync(Guid userId, string? avatarUrl, CancellationToken cancellationToken);

    /// <summary>
    /// Updates the athlete onboarding profile fields in a single UPDATE statement.
    /// Passing <c>null</c> for <paramref name="position"/>/<paramref name="jerseyNumber"/> leaves
    /// the existing value unchanged. Photo fields are cleared when the corresponding
    /// <c>remove*</c> flag is set (which takes precedence over a supplied blob path), otherwise
    /// a non-null blob path replaces the existing one and a null blob path leaves it unchanged.
    /// When <paramref name="completeOnboarding"/> is <c>true</c>, <c>OnboardingCompletedAt</c> is
    /// set to now (never cleared once set).
    /// </summary>
    Task UpdateAthleteOnboardingProfileAsync(
        Guid userId,
        PlayingPosition? position,
        int? jerseyNumber,
        string? fullBodyPhotoUrl,
        bool removeFullBodyPhoto,
        string? facePhotoUrl,
        bool removeFacePhoto,
        bool completeOnboarding,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Returns distinct email addresses of all active, non-deleted users matching the given
    /// club IDs and/or team IDs in a single query. Empty collections are ignored.
    /// </summary>
    Task<IReadOnlyList<string>> ListActiveEmailsByClubOrTeamAsync(
        IReadOnlyList<Guid> clubIds,
        IReadOnlyList<Guid> teamIds,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Returns distinct phone numbers of all active, non-deleted users matching the given
    /// club IDs and/or team IDs in a single query. Empty collections are ignored.
    /// </summary>
    Task<IReadOnlyList<string>> ListActivePhonesByClubOrTeamAsync(
        IReadOnlyList<Guid> clubIds,
        IReadOnlyList<Guid> teamIds,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Returns distinct usernames of all active, non-deleted users matching the given
    /// club IDs and/or team IDs in a single query. Empty collections are ignored.
    /// </summary>
    Task<IReadOnlyList<string>> ListActiveUsernamesByClubOrTeamAsync(
        IReadOnlyList<Guid> clubIds,
        IReadOnlyList<Guid> teamIds,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Returns distinct IDs of all active, non-deleted users matching the given
    /// club IDs and/or team IDs in a single query. Empty collections are ignored.
    /// </summary>
    Task<IReadOnlyList<Guid>> ListActiveUserIdsByClubOrTeamAsync(
        IReadOnlyList<Guid> clubIds,
        IReadOnlyList<Guid> teamIds,
        CancellationToken cancellationToken
    );

    /// <summary>Updates the display name for the given user using a direct UPDATE statement, bypassing EF Core change tracking and rowversion checks.</summary>
    Task UpdateDisplayNameAsync(
        Guid userId,
        string displayName,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Returns all active, non-deleted user records sharing the given <paramref name="externalAuthId"/>
    /// across all tenants. Used by the multi-org flow to discover which organisations a user belongs to.
    /// </summary>
    Task<IReadOnlyList<UserEntity>> FindAllByExternalAuthIdAsync(
        string externalAuthId,
        CancellationToken cancellationToken
    );

    /// <summary>Links a Parent (guardian) to an Athlete (dependent) via <see cref="UserGuardianEntity"/>. No-op if the link already exists.</summary>
    Task AddGuardianLinkAsync(
        Guid guardianId,
        Guid dependentId,
        CancellationToken cancellationToken
    );

    Task<bool> GuardianLinkExistsAsync(
        Guid guardianId,
        Guid dependentId,
        CancellationToken cancellationToken
    );

    /// <summary>Returns the IDs of all dependents (athletes) linked to the given guardian (parent).</summary>
    Task<IReadOnlyList<Guid>> ListDependentIdsForGuardianAsync(
        Guid guardianId,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Returns the guardian's links with each dependent (athlete) and that athlete's team eagerly
    /// loaded — the link rows carry
    /// <see cref="UserGuardianEntity.Relationship"/>, which
    /// <see cref="ListDependentIdsForGuardianAsync"/> cannot surface.
    /// </summary>
    Task<IReadOnlyList<UserGuardianEntity>> ListGuardianLinksWithDependentsAsync(
        Guid guardianId,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Sets <see cref="UserGuardianEntity.Relationship"/> on the guardian's own links in a single
    /// round-trip. Links belonging to another guardian are never touched, and dependent
    /// IDs with no matching link are ignored — callers validate membership first. Returns the
    /// number of links actually updated.
    /// </summary>
    Task<int> SetGuardianRelationshipsAsync(
        Guid guardianId,
        IReadOnlyDictionary<Guid, GuardianRelationship> relationshipsByDependentId,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Reverse guardian lookup: the distinct active guardians (parents) linked to any
    /// of the given dependents. Used to populate a Team Parent group from a team's athletes.
    /// </summary>
    Task<IReadOnlyList<Guid>> ListGuardianIdsForDependentsAsync(
        IReadOnlyList<Guid> dependentIds,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Returns the distinct IDs of active users on the team via the <c>UserTeams</c> join
    ///.
    /// </summary>
    Task<IReadOnlyList<Guid>> ListActiveMemberIdsForTeamAsync(
        Guid teamId,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Returns each user's LastActiveAt heartbeat (the identity split message dispatch — decides
    /// real-time-only vs OS push delivery per recipient).
    /// </summary>
    Task<IReadOnlyList<(Guid UserId, DateTime LastActiveAt)>> ListLastActiveAtAsync(
        IReadOnlyList<Guid> userIds,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Returns the count of <paramref name="userIds"/> that exist, belong to <paramref name="clubId"/>,
    /// and are assigned <paramref name="roleName"/>. Callers compare this against the distinct input
    /// count to detect cross-club or wrong-role user IDs before linking.
    /// </summary>
    Task<int> CountUsersInClubWithRoleAsync(
        IReadOnlyList<Guid> userIds,
        Guid clubId,
        string roleName,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Lists every active user in <paramref name="clubId"/> holding <paramref name="roleName"/>,
    /// ordered by display name — the DM-recipient picker's "Directors messaging Coaches" source.
    /// </summary>
    Task<IReadOnlyList<UserSummary>> ListUsersInClubWithRoleAsync(
        Guid clubId,
        string roleName,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Lists every active user linked (directly or via <c>UserTeam</c>) to any of
    /// <paramref name="teamIds"/> and holding <paramref name="roleName"/>, ordered by display
    /// name — the DM-recipient picker's "Coaches messaging their Athletes" source.
    /// </summary>
    Task<IReadOnlyList<UserSummary>> ListUsersInTeamsWithRoleAsync(
        IReadOnlyList<Guid> teamIds,
        string roleName,
        CancellationToken cancellationToken
    );

    /// <summary>Links a guardian to multiple dependents in a single round-trip. Skips any that already exist.</summary>
    Task AddGuardianLinksAsync(
        Guid guardianId,
        IReadOnlyList<Guid> dependentIds,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Links an arbitrary batch of (guardian, dependent) pairs — possibly spanning many
    /// distinct guardians — in a single round-trip. Skips any pairs
    /// that already exist. Prefer this over looping <see cref="AddGuardianLinkAsync"/>.
    /// </summary>
    Task BulkAddGuardianLinksAsync(
        IReadOnlyList<(Guid GuardianId, Guid AthleteUserId)> links,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Sets the exact set of dependents (athletes) linked to the given guardian (parent) —
    /// adds missing links and removes links not in <paramref name="dependentIds"/> (the identity split
    /// edit-mode parity). Unlike <see cref="AddGuardianLinksAsync"/>, this is a replace, not an
    /// additive merge.
    /// </summary>
    Task ReplaceGuardianLinksAsync(
        Guid guardianId,
        IReadOnlyList<Guid> dependentIds,
        CancellationToken cancellationToken
    );
}
