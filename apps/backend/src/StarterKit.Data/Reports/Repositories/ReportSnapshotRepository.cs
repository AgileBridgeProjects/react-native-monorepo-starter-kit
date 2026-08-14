using System.Data;
using Microsoft.EntityFrameworkCore;
using StarterKit.Data.Extensions;
using StarterKit.Data.Persistence;
using StarterKit.Data.Reports.Interfaces.Repositories;
using StarterKit.Data.Reports.Models;

namespace StarterKit.Data.Reports.Repositories;

public sealed class ReportSnapshotRepository : IReportSnapshotRepository
{
    private readonly AppDbContext _dbContext;

    public ReportSnapshotRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <summary>
    /// User IDs excluded from all reporting for <paramref name="clubId"/> (see
    /// <c>UserReportingExclusion</c>). Every reporting query that counts live <c>Users</c> rows
    /// filters through this so an excluded user (test/service account) never inflates a figure the
    /// snapshot-derived counts leave out — <c>ReportSnapshotRefreshJob</c> already builds those with
    /// exclusions removed. Kept as one <see cref="IQueryable{T}"/> so every call site applies the
    /// exact same exclusion via <c>!ExcludedUserIds(clubId).Contains(userId)</c> rather than
    /// repeating the subquery, which EF translates to a single <c>NOT EXISTS</c>/<c>NOT IN</c>.
    /// The explicit <c>!IsDeleted</c> is load-bearing: composed queries that call
    /// <c>IgnoreQueryFilters()</c> anywhere disable this entity's global filter too, and an
    /// un-excluded (soft-deleted) row must never keep suppressing a user.
    /// </summary>
    private IQueryable<Guid> ExcludedUserIds(Guid clubId) =>
        _dbContext
            .UserReportingExclusions.Where(e => !e.IsDeleted && e.ClubId == clubId)
            .Select(e => e.UserId);

    public async Task<IReadOnlyList<DailyClubSnapshot>> GetClubSnapshotsAsync(
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken = default
    )
    {
        return await _dbContext
            .DailyClubSnapshots.AsNoTracking()
            .Where(s => s.Date >= from && s.Date <= to)
            .OrderBy(s => s.Date)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<DailyClubSnapshot>> GetClubSnapshotsAsync(
        Guid clubId,
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken = default
    )
    {
        return await _dbContext
            .DailyClubSnapshots.AsNoTracking()
            .Where(s => s.ClubId == clubId && s.Date >= from && s.Date <= to)
            .OrderBy(s => s.Date)
            .ToListAsync(cancellationToken);
    }

    public async Task UpsertClubSnapshotAsync(
        DailyClubSnapshot snapshot,
        CancellationToken cancellationToken = default
    )
    {
        var existing = await _dbContext
            .DailyClubSnapshots.IgnoreQueryFilters()
            .FirstOrDefaultAsync(
                s => s.ClubId == snapshot.ClubId && s.Date == snapshot.Date,
                cancellationToken
            );

        if (existing is null)
        {
            await _dbContext.DailyClubSnapshots.AddAsync(snapshot, cancellationToken);
        }
        else
        {
            existing.TotalAssignedPlayers = snapshot.TotalAssignedPlayers;
            existing.TotalActivePlayers = snapshot.TotalActivePlayers;
            existing.TotalSessions = snapshot.TotalSessions;
            existing.TotalCorrectAnswers = snapshot.TotalCorrectAnswers;
            existing.TotalAnswers = snapshot.TotalAnswers;
            existing.AverageAccuracy = snapshot.AverageAccuracy;
            existing.TotalCompletions = snapshot.TotalCompletions;
            // Resurrect a previously soft-deleted row completely — leaving DeletedAt/DeletedBy
            // populated would make a live row still look tombstoned to any audit inspection.
            existing.IsDeleted = false;
            existing.DeletedAt = null;
            existing.DeletedBy = null;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<DailyTeamSnapshot>> GetTeamSnapshotsAsync(
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken = default
    )
    {
        return await _dbContext
            .DailyTeamSnapshots.AsNoTracking()
            .Where(s => s.Date >= from && s.Date <= to)
            .OrderBy(s => s.Date)
            .ToListAsync(cancellationToken);
    }

    public async Task UpsertTeamSnapshotAsync(
        DailyTeamSnapshot snapshot,
        CancellationToken cancellationToken = default
    )
    {
        var existing = await _dbContext
            .DailyTeamSnapshots.IgnoreQueryFilters()
            .FirstOrDefaultAsync(
                s =>
                    s.TeamId == snapshot.TeamId
                    && s.ClubId == snapshot.ClubId
                    && s.Date == snapshot.Date,
                cancellationToken
            );

        if (existing is null)
        {
            await _dbContext.DailyTeamSnapshots.AddAsync(snapshot, cancellationToken);
        }
        else
        {
            existing.TotalActivePlayers = snapshot.TotalActivePlayers;
            existing.TotalSessions = snapshot.TotalSessions;
            existing.CorrectAnswers = snapshot.CorrectAnswers;
            existing.TotalAnswers = snapshot.TotalAnswers;
            existing.AverageAccuracy = snapshot.AverageAccuracy;
            existing.CompletionRate = snapshot.CompletionRate;
            // Resurrect a previously soft-deleted row completely — see UpsertClubSnapshotAsync.
            existing.IsDeleted = false;
            existing.DeletedAt = null;
            existing.DeletedBy = null;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<DailyTeamSnapshot>> GetTeamSnapshotsAsync(
        Guid clubId,
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken = default
    )
    {
        return await _dbContext
            .DailyTeamSnapshots.IgnoreQueryFilters()
            .AsNoTracking()
            .Where(s => !s.IsDeleted && s.ClubId == clubId && s.Date >= from && s.Date <= to)
            .OrderBy(s => s.Date)
            .ToListAsync(cancellationToken);
    }

    public async Task<(
        IReadOnlyList<TeamReportRow> Items,
        int TotalCount,
        decimal ClubWeightedAvg,
        decimal ClubUnweightedAvg
    )> GetTeamsReportAsync(TeamReportQuery query, CancellationToken cancellationToken = default)
    {
        var dateFrom = query.From;
        var dateTo = query.To;
        // Used to convert cumulative player-day sums to a meaningful average daily active count.
        var daysInPeriod = Math.Max(1, dateTo.DayNumber - dateFrom.DayNumber + 1);

        // Per-team aggregate from the daily team snapshots:
        //  - ActiveUsers      = peak daily distinct-active count over the period (participation numerator)
        //  - AvgActivePlayers = total active player-days ÷ period length (activity numerator)
        var snapAgg = _dbContext
            .DailyTeamSnapshots.IgnoreQueryFilters()
            .AsNoTracking()
            .Where(s =>
                !s.IsDeleted && s.ClubId == query.ClubId && s.Date >= dateFrom && s.Date <= dateTo
            )
            .GroupBy(s => s.TeamId)
            .Select(g => new
            {
                TeamId = g.Key,
                TotalSessions = g.Sum(s => s.TotalSessions),
                ActiveUsers = g.Max(s => s.TotalActivePlayers),
                AvgActivePlayers = (int)
                    Math.Round((double)g.Sum(s => s.TotalActivePlayers) / daysInPeriod),
                CorrectAnswers = g.Sum(s => s.CorrectAnswers),
                TotalAnswers = g.Sum(s => s.TotalAnswers),
            });

        var q =
            from dept in _dbContext.Teams.AsNoTracking().Where(d => d.Season.ClubId == query.ClubId)
            from snap in snapAgg.Where(s => s.TeamId == dept.Id).DefaultIfEmpty()
            // The explicit !ut.IsDeleted is load-bearing, not redundant with UserTeam's global
            // filter: snapAgg's IgnoreQueryFilters() above applies to this whole composed query,
            // so a soft-deleted membership would otherwise still be counted here.
            let totalUsers = _dbContext
                .Users.AsNoTracking()
                .Count(u =>
                    u.UserTeams.Any(ut => ut.TeamId == dept.Id && !ut.IsDeleted)
                    && u.ClubId == query.ClubId
                    && u.IsActive
                    && !ExcludedUserIds(query.ClubId).Contains(u.Id)
                )
            where
                string.IsNullOrWhiteSpace(query.FilterText) || dept.Name.Contains(query.FilterText)
            select new TeamReportRow
            {
                TeamId = dept.Id,
                TeamName = dept.Name,
                TotalUsers = totalUsers,
                ActiveUsers = snap != null ? snap.ActiveUsers : 0,
                AvgDailyActivePlayers = snap != null ? snap.AvgActivePlayers : 0,
                TotalSessions = snap != null ? snap.TotalSessions : 0,
                CorrectAnswers = snap != null ? snap.CorrectAnswers : 0,
                TotalAnswers = snap != null ? snap.TotalAnswers : 0,
            };

        var (totalCount, items, clubWeightedAvg, clubUnweightedAvg) = await _dbContext
            .Database.CreateExecutionStrategy()
            .ExecuteAsync(async () =>
            {
                await using var tx = await _dbContext.Database.BeginTransactionAsync(
                    IsolationLevel.RepeatableRead,
                    cancellationToken
                );

                var count = await q.CountAsync(cancellationToken);
                var rows = await q.ApplySorting(
                        query.SortBy,
                        query.SortDescending,
                        defaultSort: "TeamName"
                    )
                    .ThenBy(r => r.TeamId)
                    .ApplyPaging(query.Page, query.PageSize)
                    .ToListAsync(cancellationToken);

                // Club-wide participation thresholds (for IsAnomaly) built from all teams.
                var allDeptUsers = await _dbContext
                    .Teams.AsNoTracking()
                    .Where(d => d.Season.ClubId == query.ClubId)
                    .Select(d => new
                    {
                        TeamId = d.Id,
                        // Same IgnoreQueryFilters bleed as totalUsers above — snapAgg disables
                        // UserTeam's global filter for this whole composed query.
                        TotalUsers = _dbContext
                            .Users.AsNoTracking()
                            .Count(u =>
                                u.UserTeams.Any(ut => ut.TeamId == d.Id && !ut.IsDeleted)
                                && u.ClubId == query.ClubId
                                && u.IsActive
                                && !ExcludedUserIds(query.ClubId).Contains(u.Id)
                            ),
                    })
                    .ToListAsync(cancellationToken);

                var allActive = (await snapAgg.ToListAsync(cancellationToken)).ToDictionary(
                    x => x.TeamId,
                    x => x.ActiveUsers
                );

                var clubAgg = allDeptUsers
                    .Select(d => new
                    {
                        d.TotalUsers,
                        ActiveUsers = allActive.GetValueOrDefault(d.TeamId, 0),
                    })
                    .ToList();

                var totalUsersAll = clubAgg.Sum(r => r.TotalUsers);
                var totalActiveAll = clubAgg.Sum(r => r.ActiveUsers);
                var weightedAvg =
                    totalUsersAll > 0
                        ? Math.Round((decimal)totalActiveAll / totalUsersAll * 100, 2)
                        : 0m;
                var unweightedAvg =
                    clubAgg.Count > 0
                        ? Math.Round(
                            clubAgg.Average(r =>
                                r.TotalUsers > 0 ? (decimal)r.ActiveUsers / r.TotalUsers * 100 : 0m
                            ),
                            2
                        )
                        : 0m;

                await tx.CommitAsync(cancellationToken);
                return (count, (IReadOnlyList<TeamReportRow>)rows, weightedAvg, unweightedAvg);
            });

        return (items, totalCount, clubWeightedAvg, clubUnweightedAvg);
    }

    public async Task<IReadOnlyList<TeamMetadataRow>> GetTeamMetadataAsync(
        Guid clubId,
        CancellationToken cancellationToken = default
    )
    {
        return await _dbContext
            .Teams.AsNoTracking()
            .Where(d => d.Season.ClubId == clubId)
            .Select(d => new TeamMetadataRow
            {
                TeamId = d.Id,
                TeamName = d.Name,
                TotalUsers = _dbContext
                    .Users.AsNoTracking()
                    .Count(u =>
                        u.UserTeams.Any(ut => ut.TeamId == d.Id)
                        && u.ClubId == clubId
                        && u.IsActive
                        && !ExcludedUserIds(clubId).Contains(u.Id)
                    ),
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> UserExistsInClubAsync(
        Guid userId,
        Guid clubId,
        CancellationToken cancellationToken = default
    )
    {
        return await _dbContext
            .Users.AsNoTracking()
            .AnyAsync(u => u.Id == userId && u.ClubId == clubId, cancellationToken);
    }
}
