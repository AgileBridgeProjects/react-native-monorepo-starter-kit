using Microsoft.EntityFrameworkCore;
using StarterKit.Data.Extensions;
using StarterKit.Data.Persistence;
using StarterKit.Data.Teams.Interfaces.Repositories;
using StarterKit.Data.Teams.Models;

namespace StarterKit.Data.Teams.Repositories;

public class TeamRepository : ITeamRepository
{
    private readonly AppDbContext _dbContext;

    public TeamRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(Team team, CancellationToken cancellationToken = default)
    {
        await _dbContext.Teams.AddAsync(team, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<Team?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Teams.FindAsync([id], cancellationToken);
    }

    public async Task<Team> GetAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Teams.GetAsync(id, cancellationToken);
    }

    public async Task UpdateAsync(Team team, CancellationToken cancellationToken = default)
    {
        _dbContext.Teams.Update(team);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var team = await _dbContext.Teams.GetAsync(id, cancellationToken);
        _dbContext.Teams.Remove(team);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<Team?> FindByNameInSeasonAsync(
        Guid seasonId,
        string name,
        CancellationToken cancellationToken = default,
        Guid? excludeId = null
    )
    {
        return await _dbContext.Teams.FirstOrDefaultAsync(
            x =>
                x.SeasonId == seasonId
                && x.Name == name
                && (excludeId == null || x.Id != excludeId),
            cancellationToken
        );
    }

    public async Task<(IReadOnlyList<TeamListItem> Items, int TotalCount)> ListAsync(
        int page,
        int pageSize,
        Guid? clubId = null,
        Guid? seasonId = null,
        string? filterText = null,
        CancellationToken cancellationToken = default
    )
    {
        var query = _dbContext
            .Teams.AsNoTracking()
            .AsQueryable()
            .WhereIf(clubId.HasValue, x => x.Season.ClubId == clubId!.Value)
            .WhereIf(seasonId.HasValue, x => x.SeasonId == seasonId!.Value)
            .WhereIf(!string.IsNullOrWhiteSpace(filterText), x => x.Name.Contains(filterText!));

        var totalCount = await query.CountAsync(cancellationToken);

        // Soft-deleted (removed) memberships are excluded by UserTeam's global query filter.
        var activeUserTeams = _dbContext.UserTeams.Join(
            _dbContext.Users.Where(u => u.IsActive),
            ut => ut.UserId,
            u => u.Id,
            (ut, u) => ut.TeamId
        );

        var projected = await query
            .OrderBy(x => x.Name)
            .ApplyPaging(page, pageSize)
            .GroupJoin(
                activeUserTeams,
                d => d.Id,
                teamId => teamId,
                (d, teamIds) => new { Team = d, UserCount = teamIds.Count() }
            )
            .ToListAsync(cancellationToken);

        var items = projected.Select(x => new TeamListItem(x.Team, x.UserCount)).ToList();

        return (items, totalCount);
    }

    public async Task<IReadOnlyList<(Guid Id, string Name)>> ListNamesAsync(
        Guid clubId,
        CancellationToken cancellationToken = default
    )
    {
        var results = await _dbContext
            .Teams.AsNoTracking()
            .Where(d => d.Season.ClubId == clubId)
            .OrderBy(d => d.Name)
            .Select(d => new { d.Id, d.Name })
            .ToListAsync(cancellationToken);

        return results.Select(x => (x.Id, x.Name)).ToList();
    }

    public async Task AddUserTeamAsync(
        Guid userId,
        Guid teamId,
        CancellationToken cancellationToken = default
    )
    {
        var exists = await UserTeamExistsAsync(userId, teamId, cancellationToken);
        if (exists)
            return;

        await _dbContext.UserTeams.AddAsync(
            new UserTeam
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                TeamId = teamId,
            },
            cancellationToken
        );
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<bool> UserTeamExistsAsync(
        Guid userId,
        Guid teamId,
        CancellationToken cancellationToken = default
    ) =>
        _dbContext.UserTeams.AnyAsync(
            x => x.UserId == userId && x.TeamId == teamId,
            cancellationToken
        );

    public async Task<IReadOnlyList<Guid>> ListTeamIdsForUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    ) =>
        await _dbContext
            .UserTeams.Where(x => x.UserId == userId)
            .Select(x => x.TeamId)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Guid>> ListTeamIdsForUsersAsync(
        IReadOnlyList<Guid> userIds,
        CancellationToken cancellationToken = default
    )
    {
        if (userIds.Count == 0)
            return [];

        return await _dbContext
            .UserTeams.Where(x => userIds.Contains(x.UserId))
            .Select(x => x.TeamId)
            .Distinct()
            .ToListAsync(cancellationToken);
    }

    public async Task AddUserTeamsAsync(
        Guid userId,
        IReadOnlyList<Guid> teamIds,
        CancellationToken cancellationToken = default
    )
    {
        if (teamIds.Count == 0)
            return;

        var existing = await _dbContext
            .UserTeams.Where(x => x.UserId == userId && teamIds.Contains(x.TeamId))
            .Select(x => x.TeamId)
            .ToListAsync(cancellationToken);
        var existingSet = existing.ToHashSet();

        var toAdd = teamIds
            .Distinct()
            .Where(teamId => !existingSet.Contains(teamId))
            .Select(teamId => new UserTeam
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                TeamId = teamId,
            })
            .ToList();

        if (toAdd.Count == 0)
            return;

        await _dbContext.UserTeams.AddRangeAsync(toAdd, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Team>> ListTeamsForUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    ) =>
        await _dbContext
            .UserTeams.AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderBy(x => x.Team.Name)
            .Select(x => x.Team)
            .ToListAsync(cancellationToken);

    public async Task<Team?> FindLinkedTeamAsync(
        Guid userId,
        Guid teamId,
        CancellationToken cancellationToken = default
    ) =>
        await _dbContext
            .UserTeams.Where(x => x.UserId == userId && x.TeamId == teamId)
            .Select(x => x.Team)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<int> CountTeamsInClubAsync(
        IReadOnlyList<Guid> teamIds,
        Guid clubId,
        CancellationToken cancellationToken = default
    ) =>
        await _dbContext
            .Teams.Where(t => teamIds.Contains(t.Id) && t.Season.ClubId == clubId)
            .CountAsync(cancellationToken);

    public async Task ReplaceUserTeamsAsync(
        Guid userId,
        IReadOnlyList<Guid> teamIds,
        CancellationToken cancellationToken = default
    )
    {
        var distinctTeamIds = teamIds.Distinct().ToHashSet();

        var existingLinks = await _dbContext
            .UserTeams.Where(x => x.UserId == userId)
            .ToListAsync(cancellationToken);

        var toRemove = existingLinks.Where(x => !distinctTeamIds.Contains(x.TeamId)).ToList();
        if (toRemove.Count > 0)
            _dbContext.UserTeams.RemoveRange(toRemove);

        var existingTeamIds = existingLinks.Select(x => x.TeamId).ToHashSet();
        var toAdd = distinctTeamIds
            .Where(teamId => !existingTeamIds.Contains(teamId))
            .Select(teamId => new UserTeam
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                TeamId = teamId,
            })
            .ToList();
        if (toAdd.Count > 0)
            await _dbContext.UserTeams.AddRangeAsync(toAdd, cancellationToken);

        if (toRemove.Count > 0 || toAdd.Count > 0)
            await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Guid>> ListUserIdsWithPermissionForTeamsAsync(
        IReadOnlyList<Guid> teamIds,
        string permission,
        CancellationToken cancellationToken = default
    )
    {
        if (!teamIds.Any())
            return [];

        // Not filtered by Role.IsActive — this only resolves who to send a live-refresh signal
        // to, not an authorization check, so an edge-case stale role costs nothing
        // worse than an unnecessary cache invalidation for a client that likely can't connect
        // to the hub anyway.
        return await _dbContext
            .UserTeams.Where(ut => teamIds.Contains(ut.TeamId))
            .Select(ut => ut.UserId)
            .Distinct()
            .Join(
                _dbContext.UserRoleAssignments,
                userId => userId,
                ura => ura.UserId,
                (userId, ura) => new { userId, ura.RoleId }
            )
            .Join(
                _dbContext.RolePermissions.Where(rp => rp.Permission == permission),
                x => x.RoleId,
                rp => rp.RoleId,
                (x, _) => x.userId
            )
            .Distinct()
            .ToListAsync(cancellationToken);
    }
}
