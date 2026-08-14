using System.Reflection;
using FluentAssertions;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using StarterKit.Core.Reports.Interfaces.Services;
using StarterKit.Core.Reports.Services;
using StarterKit.Data.Persistence;
using StarterKit.Data.Reports.Models;

namespace StarterKit.Core.Tests.Reports.Services;

public sealed class StartupSnapshotBackfillJobTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly Mock<IReportSnapshotRefreshService> _refreshService = new();
    private readonly Mock<TimeProvider> _clock = new();

    // Tuesday 2026-06-09 at 10:00 UTC
    private static readonly DateTimeOffset Now = new(2026, 6, 9, 10, 0, 0, TimeSpan.Zero);
    private static readonly DateOnly Today = DateOnly.FromDateTime(Now.UtcDateTime);
    private const int RecomputeWindowDays = 14;
    private static readonly DateOnly WindowStart = Today.AddDays(-(RecomputeWindowDays - 1));

    private readonly StartupSnapshotBackfillJob Sut;

    public StartupSnapshotBackfillJobTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _db = new AppDbContext(options);
        _clock.Setup(c => c.GetUtcNow()).Returns(Now);

        Sut = new StartupSnapshotBackfillJob(
            _db,
            _refreshService.Object,
            _clock.Object,
            NullLogger<StartupSnapshotBackfillJob>.Instance
        );
    }

    public void Dispose() => _db.Dispose();

    private void AddClubSnapshot(DateOnly date) =>
        _db.DailyClubSnapshots.Add(
            new DailyClubSnapshot
            {
                Id = Guid.NewGuid(),
                ClubId = Guid.NewGuid(),
                Date = date,
            }
        );

    private void AddTeamSnapshot(DateOnly date) =>
        _db.DailyTeamSnapshots.Add(
            new DailyTeamSnapshot
            {
                Id = Guid.NewGuid(),
                ClubId = Guid.NewGuid(),
                TeamId = Guid.NewGuid(),
                Date = date,
            }
        );

    private void AddSnapshotsThrough(DateOnly lastDate)
    {
        AddClubSnapshot(lastDate);
        AddTeamSnapshot(lastDate);
    }

    /// <summary>Simulates a prior <see cref="SnapshotBackfillRun"/> record for the given date.</summary>
    private void AddBackfillRun(DateOnly date, DateTime? completedAt)
    {
        _db.SnapshotBackfillRuns.Add(
            new SnapshotBackfillRun
            {
                Id = Guid.NewGuid(),
                Date = date,
                StartedAt = completedAt ?? Now.UtcDateTime,
                CompletedAt = completedAt,
            }
        );
    }

    [Fact]
    public async Task NoSnapshotsExist_FallsBackTo90DayWindow()
    {
        await _db.SaveChangesAsync();

        await Sut.ExecuteAsync();

        _refreshService.Verify(
            r => r.BackfillAsync(Today.AddDays(-90), Today, It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task GapExists_BackfillsFromGapStartToToday()
    {
        AddSnapshotsThrough(Today.AddDays(-20));
        await _db.SaveChangesAsync();

        await Sut.ExecuteAsync();

        _refreshService.Verify(
            r => r.BackfillAsync(Today.AddDays(-19), Today, It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task SnapshotsCurrent_FirstRunToday_RecomputesTrailingWindow()
    {
        // Snapshots are current through yesterday and no run record exists for today —
        // this is the first run of the calendar day (e.g. first redeploy today), so the
        // self-heal recompute window should still apply.
        AddSnapshotsThrough(Today.AddDays(-1));
        await _db.SaveChangesAsync();

        await Sut.ExecuteAsync();

        _refreshService.Verify(
            r => r.BackfillAsync(WindowStart, Today, It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task SnapshotsCurrent_CompletedRunRecordExistsForToday_SkipsRedundantRecompute()
    {
        // A previous restart earlier today (e.g. an earlier redeploy) already completed the full
        // recompute window. Re-running it again would just burn CPU re-aggregating the same days
        // for no new data.
        AddSnapshotsThrough(Today);
        AddBackfillRun(Today, completedAt: Now.UtcDateTime);
        await _db.SaveChangesAsync();

        await Sut.ExecuteAsync();

        _refreshService.Verify(
            r =>
                r.BackfillAsync(
                    It.IsAny<DateOnly>(),
                    It.IsAny<DateOnly>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task NightlyRefreshWroteTodaysRow_ButNoRunRecordForToday_StillRecomputesFullWindow()
    {
        // A separate nightly recurring job (`report-snapshot-refresh-nightly`) refreshes only
        // `today`'s snapshots every day at 00:00 UTC — completely independent of this job and of
        // redeploys. Since "already ran today" is tracked via an explicit SnapshotBackfillRun row
        // (not inferred from snapshot data), the nightly job writing today's snapshot data must
        // not be mistaken for this job's own recompute having run.
        AddSnapshotsThrough(Today); // simulates the nightly job having refreshed `today`
        AddBackfillRun(
            Today.AddDays(-1),
            completedAt: Today.AddDays(-1).ToDateTime(TimeOnly.MinValue)
        );
        await _db.SaveChangesAsync();

        await Sut.ExecuteAsync();

        _refreshService.Verify(
            r => r.BackfillAsync(WindowStart, Today, It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task RunRecordForToday_CrashedBeforeCompleting_StillRecomputesFullWindow()
    {
        // A prior attempt today started but never finished (e.g. the process crashed mid-run).
        // CompletedAt is null, so this must be treated as "not yet run today" and retried — not
        // wrongly skipped (ABC-123 gap-fix).
        AddSnapshotsThrough(Today);
        AddBackfillRun(Today, completedAt: null);
        await _db.SaveChangesAsync();

        await Sut.ExecuteAsync();

        _refreshService.Verify(
            r => r.BackfillAsync(WindowStart, Today, It.IsAny<CancellationToken>()),
            Times.Once
        );

        var runRecord = await _db.SnapshotBackfillRuns.SingleAsync(r => r.Date == Today);
        runRecord.CompletedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task RunRecordExistsForToday_ButNarrowerGapExists_BackfillsOnlyTheGap()
    {
        // The wide recompute already ran today, but one table (Team) is a few days stale — a
        // narrower, genuine gap must still be backfilled instead of being swallowed by the
        // "already ran today" skip.
        AddClubSnapshot(Today);
        AddTeamSnapshot(Today.AddDays(-3));
        AddBackfillRun(Today, completedAt: Now.UtcDateTime);
        await _db.SaveChangesAsync();

        await Sut.ExecuteAsync();

        _refreshService.Verify(
            r => r.BackfillAsync(Today.AddDays(-2), Today, It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task AlreadyRecomputedToday_ButOneTableIsEmpty_StillBackfillsFullHistory()
    {
        // DailyTeamSnapshots is empty (e.g. a table added after the others went live) even
        // though club snapshots already ran today — the genuine historical gap for the empty
        // table must still be backfilled regardless of the "already ran today" skip.
        AddClubSnapshot(Today);
        AddBackfillRun(Today, completedAt: Now.UtcDateTime);
        await _db.SaveChangesAsync();

        await Sut.ExecuteAsync();

        _refreshService.Verify(
            r => r.BackfillAsync(Today.AddDays(-90), Today, It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    public sealed class ConcurrencyAttributes
    {
        private static MethodInfo ExecuteAsyncMethod =>
            typeof(StartupSnapshotBackfillJob).GetMethod(
                nameof(StartupSnapshotBackfillJob.ExecuteAsync)
            )!;

        [Fact]
        public void ExecuteAsync_HasDisableConcurrentExecution()
        {
            var attribute =
                ExecuteAsyncMethod.GetCustomAttribute<DisableConcurrentExecutionAttribute>();

            attribute.Should().NotBeNull();
        }

        [Fact]
        public void ExecuteAsync_HasNoAutomaticRetry()
        {
            var attribute = ExecuteAsyncMethod.GetCustomAttribute<AutomaticRetryAttribute>();

            attribute.Should().NotBeNull();
            attribute!.Attempts.Should().Be(0);
        }
    }
}
