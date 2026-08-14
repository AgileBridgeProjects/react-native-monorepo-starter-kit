using StarterKit.Core.Reports.Enums;

namespace StarterKit.Core.Reports.Helpers;

/// <summary>
/// Determines whether a trend-series bucket (day/week/month) has fully elapsed. A daily snapshot
/// refresh (nightly job or startup backfill) can only capture sessions that have happened by the
/// time it runs — so a bucket covering "today"/"this week"/"this month" is inherently partial and
/// mechanically depressed relative to a complete period. Trend series and forecast input must
/// exclude any such in-progress trailing bucket rather than plot it as a real data point (ABC-123).
/// </summary>
public static class TrendPeriodHelper
{
    /// <summary>The last calendar day belonging to the bucket keyed by <paramref name="periodStart"/>.</summary>
    public static DateOnly PeriodEnd(DateOnly periodStart, Granularity granularity) =>
        granularity switch
        {
            Granularity.Weekly => periodStart.AddDays(6),
            Granularity.Monthly => new DateOnly(
                periodStart.Year,
                periodStart.Month,
                DateTime.DaysInMonth(periodStart.Year, periodStart.Month)
            ),
            _ => periodStart,
        };

    /// <summary>
    /// True when the bucket keyed by <paramref name="periodStart"/> has fully elapsed as of
    /// <paramref name="today"/> — i.e. it is safe to include in a trend series or forecast input.
    /// </summary>
    public static bool IsComplete(DateOnly periodStart, Granularity granularity, DateOnly today) =>
        PeriodEnd(periodStart, granularity) < today;
}
