using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StarterKit.Core.Reports.Interfaces.Services;
using StarterKit.Data.Extensions;
using StarterKit.Data.Persistence;
using StarterKit.Data.Reports.Interfaces.Repositories;
using StarterKit.Data.Reports.Models;

namespace StarterKit.Core.Reports.Services;

public sealed class ReportSnapshotRefreshJob(
    AppDbContext db,
    IReportSnapshotRepository snapshotRepository,
    TimeProvider clock,
    ILogger<ReportSnapshotRefreshJob> logger
) : IReportSnapshotRefreshService
{
    public async Task ExecuteAsync(IJobCancellationToken cancellationToken)
    {
        var ct = cancellationToken?.ShutdownToken ?? CancellationToken.None;
        var today = DateOnly.FromDateTime(clock.Now());

        logger.LogInformation("ReportSnapshotRefreshJob: refreshing snapshots for {Date}", today);
        await RefreshForDateAsync(today, ct);
        logger.LogInformation("ReportSnapshotRefreshJob: complete for {Date}", today);
    }

    public async Task BackfillAsync(
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken = default
    )
    {
        logger.LogInformation("ReportSnapshotRefreshJob: backfilling {From} → {To}", from, to);

        for (var date = from; date <= to; date = date.AddDays(1))
        {
            cancellationToken.ThrowIfCancellationRequested();
            await RefreshForDateAsync(date, cancellationToken);
        }

        logger.LogInformation("ReportSnapshotRefreshJob: backfill complete");
    }

    private async Task RefreshForDateAsync(DateOnly date, CancellationToken ct)
    {
        // Users excluded from this date's participation aggregates: permanently excluded
        // (UserReportingExclusion) plus anyone on leave covering this date (ABC-123 #1). Computed
        // once and applied uniformly to the club and team snapshots so the participation
        // KPIs never count an excluded or on-leave player.
        var excludedUserIds = await GetExcludedUserIdsForDateAsync(date, ct);

        await RefreshClubSnapshotsAsync(date, excludedUserIds, ct);
        await RefreshTeamSnapshotsAsync(date, excludedUserIds, ct);
    }

    /// <summary>
    /// User IDs to exclude from a date's participation aggregates: permanent reporting exclusions
    /// plus players whose leave covers <paramref name="date" />.
    /// </summary>
    private async Task<List<Guid>> GetExcludedUserIdsForDateAsync(
        DateOnly date,
        CancellationToken ct
    )
    {
        var permanent = await db
            .UserReportingExclusions.IgnoreQueryFilters()
            .Where(x => !x.IsDeleted)
            .Select(x => x.UserId)
            .ToListAsync(ct);

        var onLeave = await db
            .UserLeaveRecords.IgnoreQueryFilters()
            .Where(l => !l.IsDeleted && l.StartDate <= date && l.EndDate >= date)
            .Select(l => l.UserId)
            .ToListAsync(ct);

        return permanent.Union(onLeave).ToList();
    }

    private async Task RefreshClubSnapshotsAsync(
        DateOnly today,
        List<Guid> excludedUserIds,
        CancellationToken ct
    )
    {
        var clubIds = await db
            .Clubs.IgnoreQueryFilters()
            .Where(c => !c.IsDeleted)
            .Select(c => c.Id)
            .ToListAsync(ct);

        // Aggregate across every club in a single round-trip per metric instead of looping
        // per club (N+1) — this runs once per day per snapshot type, so with many clubs
        // the per-club query fan-out was the dominant cost of the backfill/recompute window.
        // Assigned players = active, non-excluded users in the club.
        var assignedPlayersByClub = await db
            .Users.IgnoreQueryFilters()
            .Where(u => !u.IsDeleted && u.IsActive && !excludedUserIds.Contains(u.Id))
            .GroupBy(u => u.ClubId)
            .Select(g => new { ClubId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.ClubId, g => g.Count, ct);

        // TotalActivePlayers = users who have ever logged in (LastLoginAt != null).
        // This is the participation rate numerator: "what % of assigned players have engaged?"
        var activePlayersByClub = await db
            .Users.IgnoreQueryFilters()
            .Where(u => !u.IsDeleted && u.LastLoginAt != null && !excludedUserIds.Contains(u.Id))
            .GroupBy(u => u.ClubId)
            .Select(g => new { ClubId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.ClubId, g => g.Count, ct);

        foreach (var clubId in clubIds)
        {
            var snapshot = new DailyClubSnapshot
            {
                ClubId = clubId,
                Date = today,
                TotalAssignedPlayers = assignedPlayersByClub.GetValueOrDefault(clubId),
                TotalActivePlayers = activePlayersByClub.GetValueOrDefault(clubId),
                TotalSessions = 0,
                TotalCorrectAnswers = 0,
                TotalAnswers = 0,
                AverageAccuracy = 0m,
                TotalCompletions = 0,
            };

            await snapshotRepository.UpsertClubSnapshotAsync(snapshot, default);
        }
    }

    private async Task RefreshTeamSnapshotsAsync(
        DateOnly today,
        List<Guid> excludedUserIds,
        CancellationToken ct
    )
    {
        // Ever-logged-in, active, non-excluded users grouped by team via UserTeams — a user
        // linked to more than one team counts toward each.
        var eligibleUsers = db
            .Users.IgnoreQueryFilters()
            .Where(u =>
                !u.IsDeleted
                && u.IsActive
                && u.LastLoginAt != null
                && !excludedUserIds.Contains(u.Id)
            );

        // The explicit !IsDeleted is load-bearing, not redundant with UserTeam's global filter:
        // IgnoreQueryFilters() above applies to the whole composed query, so joining eligibleUsers
        // in disables UserTeam's filter too and removed memberships would be counted.
        var deptGroups = await db
            .UserTeams.Where(ut => !ut.IsDeleted)
            .Join(eligibleUsers, ut => ut.UserId, u => u.Id, (ut, u) => new { ut.TeamId, u.ClubId })
            .GroupBy(x => new { x.TeamId, x.ClubId })
            .Select(g => new
            {
                g.Key.TeamId,
                g.Key.ClubId,
                ActivePlayers = g.Count(),
            })
            .ToListAsync(ct);

        // Backfill safety: a team snapshot may already exist for a date whose members are now all
        // excluded — a leave record covering the date, or a newly-added reporting exclusion, added
        // after the date was first snapshotted (ABC-123 #1). Such a team no longer appears in the
        // recomputed groups, so its stale row would never be overwritten by the upsert below.
        // Soft-delete those rows so re-running the refresh drops retroactively-excluded teams from
        // historical days instead of leaving their pre-exclusion counts frozen.
        var recomputedTeamIds = deptGroups.Select(g => g.TeamId).ToHashSet();
        var staleSnapshots = await db
            .DailyTeamSnapshots.IgnoreQueryFilters()
            .Where(s => !s.IsDeleted && s.Date == today)
            .ToListAsync(ct);
        var staleRows = staleSnapshots.Where(s => !recomputedTeamIds.Contains(s.TeamId)).ToList();
        if (staleRows.Count > 0)
        {
            foreach (var stale in staleRows)
                stale.IsDeleted = true;
            await db.SaveChangesAsync(ct);
        }

        foreach (var group in deptGroups)
        {
            var snapshot = new DailyTeamSnapshot
            {
                TeamId = group.TeamId,
                ClubId = group.ClubId,
                Date = today,
                TotalActivePlayers = group.ActivePlayers,
                TotalSessions = 0,
                CorrectAnswers = 0,
                TotalAnswers = 0,
                AverageAccuracy = 0m,
                CompletionRate = 0m,
            };

            await snapshotRepository.UpsertTeamSnapshotAsync(snapshot, default);
        }
    }
}
