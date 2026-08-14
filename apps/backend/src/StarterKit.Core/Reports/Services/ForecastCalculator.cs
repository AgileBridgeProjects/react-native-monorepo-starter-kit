using StarterKit.Core.Reports.DTOs;

namespace StarterKit.Core.Reports.Services;

/// <summary>
/// Least-squares linear regression with a growing prediction-interval cone, ported from the
/// TypeScript linearForecastWithCI helper so forecast computation lives on the server.
/// </summary>
public static class ForecastCalculator
{
    /// <summary>Minimum series length for a high-confidence forecast (n &lt; 4 → low confidence).</summary>
    public const int LowConfidenceThreshold = 4;

    /// <summary>
    /// Computes <paramref name="steps"/> forecast points for the given trend series.
    /// Returns null when the series has fewer than 2 points or is degenerate (zero variance).
    /// </summary>
    /// <param name="series">Ordered trend points (oldest first, x = 0…n-1).</param>
    /// <param name="isPercentage">
    ///   When true the result is clamped to [0, 100] (participation %, achievement %).
    ///   When false only the floor of 0 is applied (active player count, session count).
    /// </param>
    /// <param name="steps">
    ///   Number of future steps to project. Defaults to <c>series.Count</c> so the cone
    ///   spans as many future periods as there are historical periods.
    /// </param>
    public static IReadOnlyList<ForecastPointDto>? Compute(
        IReadOnlyList<TrendPointDto> series,
        bool isPercentage,
        int? steps = null
    )
    {
        if (series.Count < 2)
            return null;

        var n = series.Count;
        var ys = series.Select(p => (double)p.Value).ToArray();

        // OLS with x = 0, 1, …, n-1 (closed-form sums).
        var sumX = (double)(n * (n - 1)) / 2;
        var sumX2 = (double)(n * (n - 1) * (2 * n - 1)) / 6;
        var sumY = ys.Sum();
        var sumXY = ys.Select((y, i) => i * y).Sum();
        var denom = n * sumX2 - sumX * sumX;
        if (denom == 0)
            return null;

        var m = (n * sumXY - sumX * sumY) / denom;
        var b = (sumY - m * sumX) / n;

        // Residual standard error; |slope| proxy when there are not enough df (n < 3).
        var rss = ys.Select((y, i) => Math.Pow(y - (m * i + b), 2)).Sum();
        var rse = n < 3 ? Math.Abs(m) : Math.Sqrt(rss / (n - 2));

        var xMean = (n - 1) / 2.0;
        var sxx = Enumerable.Range(0, n).Sum(i => Math.Pow(i - xMean, 2));

        // Infer interval from the gap between the last two dated points.
        var last = series[n - 1].Date;
        var prev = series[n - 2].Date;
        var intervalDays = last.DayNumber - prev.DayNumber;
        if (intervalDays <= 0)
            return null;

        var actualSteps = steps ?? n;
        var result = new List<ForecastPointDto>(actualSteps);
        var isLowConfidence = n < LowConfidenceThreshold;

        for (var k = 1; k <= actualSteps; k++)
        {
            var xForecast = n - 1 + k;
            var raw = m * xForecast + b;
            var halfWidth =
                rse
                * Math.Sqrt(1 + 1.0 / n + Math.Pow(xForecast - xMean, 2) / (sxx == 0 ? 1 : sxx));

            result.Add(
                new ForecastPointDto(
                    Date: last.AddDays(intervalDays * k),
                    Value: Clamp(raw, isPercentage),
                    Lower: Clamp(raw - halfWidth, isPercentage),
                    Upper: Clamp(raw + halfWidth, isPercentage),
                    IsLowConfidence: isLowConfidence
                )
            );
        }

        return result;
    }

    private static decimal Clamp(double v, bool isPercentage)
    {
        var rounded = Math.Round(v * 10) / 10;
        var floored = Math.Max(0, rounded);
        return (decimal)(isPercentage ? Math.Min(100, floored) : floored);
    }
}
