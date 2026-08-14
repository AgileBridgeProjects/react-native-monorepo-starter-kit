using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StarterKit.Core.Reports.Interfaces.Services;
using StarterKit.Data.Extensions;
using StarterKit.Data.Persistence;
using StarterKit.Data.Reports.Models;

namespace StarterKit.Core.Reports.Services;

/// <summary>
/// Enqueued once at startup: detects the newest existing snapshot date and backfills
/// any gap between that date and today.  Idempotent — the upsert pattern means
/// re-running for already-computed dates is harmless.  Falls back to 90 days if no
/// snapshots exist yet.
///
/// It also re-aggregates the most recent <see cref="RecomputeWindowDays"/> days (overwriting
/// existing rows via the upsert) once per calendar day, so values that were stored stale — e.g. a
/// metric added after a date was first snapshotted, or sessions back-dated/edited — self-heal
/// instead of remaining frozen at their first-computed value (ABC-123). The recompute pass is
/// skipped on subsequent restarts within the same day (redeploys) — only a genuine gap still
/// triggers a backfill — so redeploying repeatedly doesn't repeatedly burn CPU re-aggregating the
/// same window (ABC-123).
///
/// The "already ran today" signal is a dedicated <see cref="SnapshotBackfillRun"/> row for
/// today's date with <c>CompletedAt</c> set — not inferred from side-effects on snapshot data
/// (e.g. a row dated `today`), which would be indistinguishable from the separate nightly
/// <c>report-snapshot-refresh-nightly</c> job that also touches `today` independently of this
/// job and of redeploys. A crash partway through today's recompute leaves the run row without
/// <c>CompletedAt</c>, so the next startup correctly treats today as not-yet-recomputed instead
/// of producing a false-positive skip.
/// </summary>
public sealed class StartupSnapshotBackfillJob(
    AppDbContext db,
    IReportSnapshotRefreshService refreshService,
    TimeProvider clock,
    ILogger<StartupSnapshotBackfillJob> logger
)
{
    /// <summary>How many trailing days are unconditionally re-aggregated on each startup.</summary>
    private const int RecomputeWindowDays = 14;

    // Enqueued independently by every instance on startup — if 2+ instances redeploy at once
    // (rolling deploy, scaled-out plan), each would otherwise run its own concurrent 14-day
    // recompute against the same rows. [DisableConcurrentExecution] adds a cluster-wide lock so
    // only one instance's run proceeds; timeoutInSeconds: 0 fails the duplicate immediately
    // rather than queueing it, since a skipped run is harmless (ABC-123 self-heal covers it on
    // the next restart).
    [AutomaticRetry(Attempts = 0)]
    [DisableConcurrentExecution(timeoutInSeconds: 0)]
    public async Task ExecuteAsync(CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(clock.Now());

        // Gap detection must consider every snapshot table — a table added after the
        // others starts empty while the rest are current, and keying off a single table
        // would skip its entire history.
        var lastClub = await db
            .DailyClubSnapshots.IgnoreQueryFilters()
            .Where(s => !s.IsDeleted)
            .MaxAsync(s => (DateOnly?)s.Date, cancellationToken);
        var lastTeam = await db
            .DailyTeamSnapshots.IgnoreQueryFilters()
            .Where(s => !s.IsDeleted)
            .MaxAsync(s => (DateOnly?)s.Date, cancellationToken);

        // The oldest of the two maxima is where the gap starts. Any empty table
        // (null max) forces the full 90-day fallback so its history gets built.
        DateOnly? lastSnapshot =
            lastClub is null || lastTeam is null
                ? null
                : new[] { lastClub.Value, lastTeam.Value }.Min();

        var gapFrom = lastSnapshot.HasValue ? lastSnapshot.Value.AddDays(1) : today.AddDays(-90);

        // Re-aggregate the trailing recompute window so stale values (a metric added later, an
        // edited/back-dated session) are overwritten — but only once per calendar day. "Already
        // ran today" is tracked via an explicit SnapshotBackfillRun row rather than inferred from
        // snapshot data side-effects — see the type doc comment for why.
        var runToday = await db
            .SnapshotBackfillRuns.IgnoreQueryFilters()
            .Where(r => !r.IsDeleted && r.Date == today)
            .FirstOrDefaultAsync(cancellationToken);

        var recomputeAlreadyRanToday = runToday?.CompletedAt is not null;

        var recomputeWindowStart = today.AddDays(-(RecomputeWindowDays - 1));
        var recomputeFrom = recomputeAlreadyRanToday ? today.AddDays(1) : recomputeWindowStart;
        var from = gapFrom < recomputeFrom ? gapFrom : recomputeFrom;

        if (from > today)
        {
            logger.LogInformation(
                "StartupSnapshotBackfillJob: snapshots are current — nothing to backfill"
            );
            return;
        }

        // Record the recompute-window attempt before doing the work so a crash mid-run leaves
        // CompletedAt null — the next startup then correctly re-attempts today's recompute
        // instead of wrongly skipping it. Only tracked when the recompute window is actually
        // about to run today — a narrower gap-only backfill (recompute already done today)
        // doesn't touch this record.
        if (!recomputeAlreadyRanToday)
        {
            if (runToday is null)
            {
                runToday = new SnapshotBackfillRun { Date = today, StartedAt = clock.Now() };
                db.SnapshotBackfillRuns.Add(runToday);
            }
            else
            {
                runToday.StartedAt = clock.Now();
            }
            await db.SaveChangesAsync(cancellationToken);
        }

        var days = today.DayNumber - from.DayNumber + 1;
        logger.LogInformation(
            "StartupSnapshotBackfillJob: backfilling/recomputing {Days} day(s) from {From} to {To}",
            days,
            from,
            today
        );

        await refreshService.BackfillAsync(from, today, cancellationToken);

        if (!recomputeAlreadyRanToday)
        {
            runToday!.CompletedAt = clock.Now();
            await db.SaveChangesAsync(cancellationToken);
        }

        logger.LogInformation("StartupSnapshotBackfillJob: complete");
    }
}
