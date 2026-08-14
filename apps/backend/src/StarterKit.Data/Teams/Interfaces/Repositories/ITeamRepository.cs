using StarterKit.Data.Teams.Models;

namespace StarterKit.Data.Teams.Interfaces.Repositories;

public interface ITeamRepository
{
    Task AddAsync(Team team, CancellationToken cancellationToken = default);
    Task<Team?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Team> GetAsync(Guid id, CancellationToken cancellationToken = default);
    Task UpdateAsync(Team team, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);

    Task<Team?> FindByNameInSeasonAsync(
        Guid seasonId,
        string name,
        CancellationToken cancellationToken = default,
        Guid? excludeId = null
    );

    /// <summary>
    /// Lists teams, optionally filtered by club (joined transitively via <c>Team.Season.ClubId</c>)
    /// and/or by season directly.
    /// </summary>
    Task<(IReadOnlyList<TeamListItem> Items, int TotalCount)> ListAsync(
        int page,
        int pageSize,
        Guid? clubId = null,
        Guid? seasonId = null,
        string? filterText = null,
        CancellationToken cancellationToken = default
    );

    Task<IReadOnlyList<(Guid Id, string Name)>> ListNamesAsync(
        Guid clubId,
        CancellationToken cancellationToken = default
    );

    /// <summary>Links a user to a team via the many-to-many <see cref="UserTeam"/> join. No-op if the link already exists.</summary>
    Task AddUserTeamAsync(Guid userId, Guid teamId, CancellationToken cancellationToken = default);

    Task<bool> UserTeamExistsAsync(
        Guid userId,
        Guid teamId,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Returns the distinct IDs of all teams the given users are linked to via
    /// <see cref="UserTeam"/> — one query for the whole set, so callers reconciling several
    /// users (e.g. a guardian's dependents) don't issue a query per user.
    /// </summary>
    Task<IReadOnlyList<Guid>> ListTeamIdsForUsersAsync(
        IReadOnlyList<Guid> userIds,
        CancellationToken cancellationToken = default
    );

    /// <summary>Returns the IDs of all teams the given user is linked to via <see cref="UserTeam"/>.</summary>
    Task<IReadOnlyList<Guid>> ListTeamIdsForUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Returns the full <see cref="Team"/> rows the given user is linked to via
    /// <see cref="UserTeam"/>, ordered by name. Unlike
    /// <see cref="ListTeamIdsForUserAsync"/> this loads team detail (name, age group, logo) needed
    /// to render the coach's linked-teams onboarding step.
    /// </summary>
    Task<IReadOnlyList<Team>> ListTeamsForUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Returns the given team if the given user is linked to it via <see cref="UserTeam"/>, else
    /// null — a single round-trip combining what would otherwise be a separate
    /// <see cref="UserTeamExistsAsync"/> check followed by <see cref="GetAsync"/>. The
    /// returned entity is tracked, ready for the caller to mutate and persist.
    /// </summary>
    Task<Team?> FindLinkedTeamAsync(
        Guid userId,
        Guid teamId,
        CancellationToken cancellationToken = default
    );

    /// <summary>Links a user to multiple teams in a single round-trip. Skips any that already exist.</summary>
    Task AddUserTeamsAsync(
        Guid userId,
        IReadOnlyList<Guid> teamIds,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Returns the count of <paramref name="teamIds"/> that both exist and belong to <paramref name="clubId"/>
    /// (via <c>Team.Season.ClubId</c>). Callers compare this against the distinct input count to detect
    /// cross-club or non-existent team IDs before linking.
    /// </summary>
    Task<int> CountTeamsInClubAsync(
        IReadOnlyList<Guid> teamIds,
        Guid clubId,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Sets the exact set of teams the given user is linked to via <see cref="UserTeam"/> —
    /// adds missing links and removes links not in <paramref name="teamIds"/> (the identity split edit-mode
    /// parity). Unlike <see cref="AddUserTeamsAsync"/>, this is a replace, not an additive merge.
    /// </summary>
    Task ReplaceUserTeamsAsync(
        Guid userId,
        IReadOnlyList<Guid> teamIds,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Returns the distinct ids of every user linked (via <see cref="UserTeam"/>) to any of
    /// <paramref name="teamIds"/> who holds a role granting <paramref name="permission"/> — e.g.
    /// every Coach/Director who can see a given athlete's team (the identity split AC 7, resolving who to
    /// notify when an assignment is completed). Takes the raw permission string rather than a
    /// typed enum: the permission constants live in <c>StarterKit.Auth</c>, which depends on
    /// <c>StarterKit.Core</c> (not the other way around), so this layer can't reference them directly.
    /// </summary>
    Task<IReadOnlyList<Guid>> ListUserIdsWithPermissionForTeamsAsync(
        IReadOnlyList<Guid> teamIds,
        string permission,
        CancellationToken cancellationToken = default
    );
}
