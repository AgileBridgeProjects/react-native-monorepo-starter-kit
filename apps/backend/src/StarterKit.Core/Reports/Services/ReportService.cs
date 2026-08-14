using StarterKit.Core.Common;
using StarterKit.Core.Helpers;
using StarterKit.Core.Interfaces;
using StarterKit.Core.Reports.DTOs;
using StarterKit.Core.Reports.Enums;
using StarterKit.Core.Reports.Helpers;
using StarterKit.Core.Reports.Interfaces.Services;
using StarterKit.Data.Exceptions;
using StarterKit.Data.Extensions;
using StarterKit.Data.Reports;
using StarterKit.Data.Reports.Interfaces.Repositories;
using StarterKit.Data.Reports.Models;

namespace StarterKit.Core.Reports.Services;

public sealed class ReportService(
    IReportSnapshotRepository snapshotRepo,
    IUserReportingExclusionRepository exclusionRepo,
    IUserLeaveRecordRepository leaveRepo,
    ICurrentSession currentSession,
    TimeProvider clock
) : IReportService
{
    public async Task<SummaryReportDto> GetSummaryAsync(
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken = default,
        Guid? clubId = null
    )
    {
        var resolvedClubId = clubId ?? currentSession.ClubId;
        var spanDays = to.DayNumber - from.DayNumber + 1;
        var priorFrom = from.AddDays(-spanDays);
        var priorTo = from.AddDays(-1);

        var current = await snapshotRepo.GetClubSnapshotsAsync(
            resolvedClubId,
            from,
            to,
            cancellationToken
        );
        var prior = await snapshotRepo.GetClubSnapshotsAsync(
            resolvedClubId,
            priorFrom,
            priorTo,
            cancellationToken
        );

        var (
            currentSessions,
            currentCorrect,
            currentAnswers,
            currentCompletions,
            currentPlayers,
            currentAssigned
        ) = Aggregate(current);
        var (
            priorSessions,
            priorCorrect,
            priorAnswers,
            priorCompletions,
            priorPlayers,
            priorAssigned
        ) = Aggregate(prior);

        var currentAccuracy = ComputeAccuracy(currentCorrect, currentAnswers);
        var priorAccuracy = ComputeAccuracy(priorCorrect, priorAnswers);
        // Participation rate: ever-active headcount / assigned players.
        var currentParticipation = ComputeParticipationRate(currentPlayers, currentAssigned);
        var priorParticipation = ComputeParticipationRate(priorPlayers, priorAssigned);

        return new SummaryReportDto
        {
            DateFrom = from,
            DateTo = to,
            ParticipationRate = currentParticipation,
            ParticipationRateDelta = currentParticipation - priorParticipation,
            TotalActivePlayers = currentPlayers,
            TotalActivePlayersDelta = currentPlayers - priorPlayers,
            TotalSessions = currentSessions,
            TotalSessionsDelta = currentSessions - priorSessions,
            AverageAccuracy = currentAccuracy,
            AverageAccuracyDelta = currentAccuracy - priorAccuracy,
            TotalCompletions = currentCompletions,
            TotalCompletionsDelta = currentCompletions - priorCompletions,
        };
    }

    public async Task<TrendReportDto> GetTrendsAsync(
        DateOnly from,
        DateOnly to,
        Granularity granularity,
        CancellationToken cancellationToken = default,
        Guid? clubId = null
    )
    {
        // Resolve the club explicitly so a background export job (no session club)
        // can request trends for a specific club, mirroring the other report methods.
        var resolvedClubId = clubId ?? currentSession.ClubId;
        var snapshots = await snapshotRepo.GetClubSnapshotsAsync(
            resolvedClubId,
            from,
            to,
            cancellationToken
        );

        // Exclude a still-in-progress "today"/"this week"/"this month" bucket — the snapshot
        // refresh job can only capture sessions that have happened by the time it runs, so a
        // partial period's rate is mechanically depressed relative to a complete one and would
        // both plot as a false cliff and poison the forecast's anchor point (ABC-123).
        var today = DateOnly.FromDateTime(clock.Now());
        var grouped = snapshots
            .GroupBy(s => GroupKey(s.Date, granularity))
            .Where(g => TrendPeriodHelper.IsComplete(g.Key, granularity, today))
            .OrderBy(g => g.Key)
            .Select(g =>
            {
                var list = g.ToList();
                var totalCorrect = list.Sum(s => s.TotalCorrectAnswers);
                var totalAnswers = list.Sum(s => s.TotalAnswers);
                var mostRecent = list.MaxBy(s => s.Date);
                var activePlayers = mostRecent?.TotalActivePlayers ?? 0;
                return new
                {
                    Date = g.Key,
                    Accuracy = ComputeAccuracy(totalCorrect, totalAnswers),
                    ParticipationRate = ComputeParticipationRate(
                        activePlayers,
                        mostRecent?.TotalAssignedPlayers ?? 0
                    ),
                    TotalSessions = list.Sum(s => s.TotalSessions),
                    ActivePlayers = activePlayers,
                };
            })
            .ToList();

        var participationTrend = grouped
            .Select(g => new TrendPointDto(g.Date, g.ParticipationRate))
            .ToList();
        var achievementTrend = grouped.Select(g => new TrendPointDto(g.Date, g.Accuracy)).ToList();
        var sessionsTrend = grouped
            .Select(g => new TrendPointDto(g.Date, g.TotalSessions))
            .ToList();
        var activePlayersTrend = grouped
            .Select(g => new TrendPointDto(g.Date, g.ActivePlayers))
            .ToList();

        return new TrendReportDto
        {
            ParticipationTrend = participationTrend,
            AchievementTrend = achievementTrend,
            SessionsTrend = sessionsTrend,
            ActivePlayersTrend = activePlayersTrend,
            ParticipationForecast =
                ForecastCalculator.Compute(participationTrend, isPercentage: true) ?? [],
            AchievementForecast =
                ForecastCalculator.Compute(achievementTrend, isPercentage: true) ?? [],
            SessionsForecast = ForecastCalculator.Compute(sessionsTrend, isPercentage: false) ?? [],
            ActivePlayersForecast =
                ForecastCalculator.Compute(activePlayersTrend, isPercentage: false) ?? [],
        };
    }

    public async Task<IReadOnlyList<ExclusionDto>> GetExclusionsAsync(
        CancellationToken cancellationToken = default
    )
    {
        var rows = await exclusionRepo.GetAllWithDisplayNamesAsync(cancellationToken);

        return rows.Select(e => new ExclusionDto
            {
                UserId = e.UserId,
                DisplayName = e.DisplayName,
                Reason = e.Reason,
                CreatedAt = e.CreatedAt,
            })
            .ToList();
    }

    public async Task AddExclusionAsync(
        Guid userId,
        string? reason,
        CancellationToken cancellationToken = default
    )
    {
        if (
            !await snapshotRepo.UserExistsInClubAsync(
                userId,
                currentSession.ClubId,
                cancellationToken
            )
        )
            throw new EntityNotFoundException("User", userId);

        var exclusion = new UserReportingExclusion
        {
            UserId = userId,
            ClubId = currentSession.ClubId,
            Reason = reason,
        };

        await exclusionRepo.AddAsync(exclusion, cancellationToken);
    }

    public Task RemoveExclusionAsync(Guid userId, CancellationToken cancellationToken = default) =>
        exclusionRepo.DeleteByUserIdAsync(userId, cancellationToken);

    public async Task<IReadOnlyList<LeaveRecordDto>> GetLeaveRecordsAsync(
        CancellationToken cancellationToken = default
    )
    {
        var rows = await leaveRepo.GetAllWithDisplayNamesAsync(
            currentSession.ClubId,
            cancellationToken
        );

        return rows.Select(r => new LeaveRecordDto
            {
                Id = r.Id,
                UserId = r.UserId,
                DisplayName = r.DisplayName,
                TeamName = r.TeamName,
                StartDate = r.StartDate,
                EndDate = r.EndDate,
                Reason = r.Reason,
                CreatedAt = r.CreatedAt,
            })
            .ToList();
    }

    public async Task<LeaveRecordDto> CreateLeaveRecordAsync(
        Guid userId,
        DateOnly startDate,
        DateOnly endDate,
        string? reason,
        CancellationToken cancellationToken = default
    )
    {
        if (endDate < startDate)
            throw new ArgumentException("The end date must be on or after the start date.");

        if (
            !await snapshotRepo.UserExistsInClubAsync(
                userId,
                currentSession.ClubId,
                cancellationToken
            )
        )
            throw new EntityNotFoundException("User", userId);

        var record = new UserLeaveRecord
        {
            UserId = userId,
            ClubId = currentSession.ClubId,
            StartDate = startDate,
            EndDate = endDate,
            Reason = reason,
        };

        await leaveRepo.AddAsync(record, cancellationToken);

        var rows = await leaveRepo.GetAllWithDisplayNamesAsync(
            currentSession.ClubId,
            cancellationToken
        );
        var row = rows.First(r => r.Id == record.Id);
        return new LeaveRecordDto
        {
            Id = row.Id,
            UserId = row.UserId,
            DisplayName = row.DisplayName,
            TeamName = row.TeamName,
            StartDate = row.StartDate,
            EndDate = row.EndDate,
            Reason = row.Reason,
            CreatedAt = row.CreatedAt,
        };
    }

    public Task DeleteLeaveRecordAsync(Guid id, CancellationToken cancellationToken = default) =>
        leaveRepo.DeleteByIdAsync(id, currentSession.ClubId, cancellationToken);

    public async Task<TeamsReportDto> GetTeamsAsync(
        DateOnly from,
        DateOnly to,
        int page,
        int pageSize,
        string? filterText = null,
        string? sortBy = null,
        bool sortDescending = false,
        CancellationToken cancellationToken = default,
        Guid? clubId = null
    )
    {
        var query = new TeamReportQuery
        {
            ClubId = clubId ?? currentSession.ClubId,
            From = from,
            To = to,
            Page = page,
            PageSize = pageSize,
            FilterText = filterText,
            SortBy = sortBy,
            SortDescending = sortDescending,
        };

        var (rows, totalCount, clubWeightedAvg, clubUnweightedAvg) =
            await snapshotRepo.GetTeamsReportAsync(query, cancellationToken);

        return new TeamsReportDto
        {
            Teams = new PagedResult<TeamReportItemDto>
            {
                Items = rows.Select(r => ToTeamDto(r, clubWeightedAvg)).ToList(),
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
            },
            WeightedAverageParticipationRate = clubWeightedAvg,
            UnweightedAverageParticipationRate = clubUnweightedAvg,
        };
    }

    public async Task<IReadOnlyList<TeamTrendDto>> GetTeamTrendsAsync(
        DateOnly from,
        DateOnly to,
        Granularity granularity,
        CancellationToken cancellationToken = default
    )
    {
        var clubId = currentSession.ClubId;
        var teams = await snapshotRepo.GetTeamMetadataAsync(clubId, cancellationToken);
        var snapshots = await snapshotRepo.GetTeamSnapshotsAsync(
            clubId,
            from,
            to,
            cancellationToken
        );

        var snapshotsByDept = snapshots
            .GroupBy(s => s.TeamId)
            .ToDictionary(g => g.Key, g => g.ToList());

        // Exclude a still-in-progress trailing bucket — see GetTrendsAsync for why.
        var today = DateOnly.FromDateTime(clock.Now());
        return teams
            .Select(dept =>
            {
                var deptSnaps = snapshotsByDept.GetValueOrDefault(dept.TeamId) ?? [];
                var points = deptSnaps
                    .GroupBy(s => GroupKey(s.Date, granularity))
                    .Where(g => TrendPeriodHelper.IsComplete(g.Key, granularity, today))
                    .OrderBy(g => g.Key)
                    .Select(g =>
                    {
                        // Peak daily distinct-active count within the period bucket.
                        var activePlayers = g.Max(s => s.TotalActivePlayers);
                        var rate =
                            dept.TotalUsers > 0
                                ? Math.Round((decimal)activePlayers / dept.TotalUsers * 100, 2)
                                : 0m;
                        return new TrendPointDto(g.Key, rate);
                    })
                    .ToList();
                return new TeamTrendDto
                {
                    TeamId = dept.TeamId,
                    TeamName = dept.TeamName,
                    Points = points,
                    Forecast = ForecastCalculator.Compute(points, isPercentage: true) ?? [],
                };
            })
            .ToList();
    }

    private static (
        int sessions,
        int correct,
        int answers,
        int completions,
        int players,
        int assigned
    ) Aggregate(IReadOnlyList<DailyClubSnapshot> snapshots)
    {
        var sessions = snapshots.Sum(s => s.TotalSessions);
        var correct = snapshots.Sum(s => s.TotalCorrectAnswers);
        var answers = snapshots.Sum(s => s.TotalAnswers);
        var completions = snapshots.Sum(s => s.TotalCompletions);
        // TotalActivePlayers   = ever-logged-in headcount (participation rate numerator).
        // TotalAssignedPlayers = distinct users with any assignment (stable across the period).
        // Max gives the most current headcount over the selected range.
        var players = snapshots.Max(s => (int?)s.TotalActivePlayers) ?? 0;
        var assigned = snapshots.Max(s => (int?)s.TotalAssignedPlayers) ?? 0;
        return (sessions, correct, answers, completions, players, assigned);
    }

    private static decimal ComputeAccuracy(int correct, int answers) =>
        answers > 0 ? Math.Round((decimal)correct / answers * 100, 2) : 0m;

    private static decimal ComputeParticipationRate(int activePlayers, int assignedPlayers) =>
        assignedPlayers > 0
            ? Math.Min(100m, Math.Round((decimal)activePlayers / assignedPlayers * 100, 2))
            : 0m;

    private static DateOnly GroupKey(DateOnly date, Granularity granularity) =>
        granularity switch
        {
            Granularity.Weekly => DateHelper.StartOfIsoWeek(date),
            Granularity.Monthly => new DateOnly(date.Year, date.Month, 1),
            _ => date,
        };

    private static TeamReportItemDto ToTeamDto(TeamReportRow row, decimal clubWeightedAvg)
    {
        // Participation rate: distinct players who played at all / total users.
        var participationRate =
            row.TotalUsers > 0
                ? Math.Round((decimal)row.ActiveUsers / row.TotalUsers * 100, 2)
                : 0m;
        // Activity rate: average daily active players / total users.
        var activityRate =
            row.TotalUsers > 0
                ? Math.Round((decimal)row.AvgDailyActivePlayers / row.TotalUsers * 100, 2)
                : 0m;
        return new TeamReportItemDto
        {
            TeamId = row.TeamId,
            TeamName = row.TeamName,
            TotalUsers = row.TotalUsers,
            ActiveUsers = row.ActiveUsers,
            ParticipationRate = participationRate,
            ActivityRate = activityRate,
            TotalSessions = row.TotalSessions,
            AverageAccuracy =
                row.TotalAnswers > 0
                    ? Math.Round((decimal)row.CorrectAnswers / row.TotalAnswers * 100, 2)
                    : 0m,
            IsAnomaly = participationRate < clubWeightedAvg * 0.5m,
        };
    }
}
