using FluentAssertions;
using StarterKit.Core.Reports.DTOs;
using StarterKit.Core.Reports.Services;

namespace StarterKit.Core.Tests.Reports.Services;

public class ForecastCalculatorTests
{
    private static TrendPointDto Pt(int daysFromEpoch, decimal value) =>
        new(new DateOnly(2024, 1, 1).AddDays(daysFromEpoch), value);

    // -----------------------------------------------------------------------
    // Null / degenerate inputs
    // -----------------------------------------------------------------------

    [Fact]
    public void Compute_ReturnsNull_WhenSeriesHasOnlyOnePoint()
    {
        var series = new[] { Pt(0, 50m) };
        ForecastCalculator.Compute(series, isPercentage: true).Should().BeNull();
    }

    [Fact]
    public void Compute_ReturnsNull_WhenAllValuesAreIdentical()
    {
        // When all y values are the same the denominator (n·Σx²−(Σx)²) is zero only when
        // all x values are the same — that can't happen here. A flat series should still
        // produce a zero-slope forecast rather than null.
        var series = new[] { Pt(0, 10m), Pt(1, 10m), Pt(2, 10m) };
        var result = ForecastCalculator.Compute(series, isPercentage: false);
        result.Should().NotBeNull();
        result![0].Value.Should().Be(10m);
    }

    // -----------------------------------------------------------------------
    // Step count
    // -----------------------------------------------------------------------

    [Fact]
    public void Compute_DefaultSteps_EqualsSeriesCount()
    {
        var series = new[] { Pt(0, 10m), Pt(1, 20m), Pt(2, 30m) };
        var result = ForecastCalculator.Compute(series, isPercentage: false);
        result.Should().HaveCount(series.Length);
    }

    [Fact]
    public void Compute_ExplicitSteps_RespectsParameter()
    {
        var series = new[] { Pt(0, 10m), Pt(1, 20m), Pt(2, 30m) };
        var result = ForecastCalculator.Compute(series, isPercentage: false, steps: 1);
        result.Should().HaveCount(1);
    }

    // -----------------------------------------------------------------------
    // Date projection
    // -----------------------------------------------------------------------

    [Fact]
    public void Compute_ProjectsDatesByInferredInterval()
    {
        // Daily series → each forecast date is 1 day after the previous.
        var series = new[] { Pt(0, 10m), Pt(1, 20m), Pt(2, 30m) };
        var result = ForecastCalculator.Compute(series, isPercentage: false, steps: 3)!;
        result[0].Date.Should().Be(new DateOnly(2024, 1, 4));
        result[1].Date.Should().Be(new DateOnly(2024, 1, 5));
        result[2].Date.Should().Be(new DateOnly(2024, 1, 6));
    }

    [Fact]
    public void Compute_ProjectsWeeklyInterval()
    {
        // Weekly series (7-day gap between last two points).
        var series = new[] { Pt(0, 10m), Pt(7, 20m), Pt(14, 30m) };
        var result = ForecastCalculator.Compute(series, isPercentage: false, steps: 2)!;
        result[0].Date.Should().Be(new DateOnly(2024, 1, 22));
        result[1].Date.Should().Be(new DateOnly(2024, 1, 29));
    }

    [Fact]
    public void Compute_ReturnsNull_WhenIntervalIsNonPositive()
    {
        // Same date for the last two points → interval = 0.
        var series = new[]
        {
            Pt(0, 10m),
            Pt(1, 20m),
            new TrendPointDto(new DateOnly(2024, 1, 2), 30m), // same day as previous
        };
        ForecastCalculator.Compute(series, isPercentage: false).Should().BeNull();
    }

    // -----------------------------------------------------------------------
    // Trend projection
    // -----------------------------------------------------------------------

    [Fact]
    public void Compute_ProjectsPerfectLinearTrend()
    {
        // y = 10x → forecast at x=3 should be 30.
        var series = new[] { Pt(0, 0m), Pt(1, 10m), Pt(2, 20m) };
        var result = ForecastCalculator.Compute(series, isPercentage: false, steps: 1)!;
        result[0].Value.Should().Be(30m);
    }

    [Fact]
    public void Compute_ConeWidensWithEachStep()
    {
        // The confidence interval should be wider at step 2 than at step 1.
        var series = new[] { Pt(0, 10m), Pt(1, 12m), Pt(2, 11m), Pt(3, 13m), Pt(4, 14m) };
        var result = ForecastCalculator.Compute(series, isPercentage: false, steps: 2)!;
        var width0 = result[0].Upper - result[0].Lower;
        var width1 = result[1].Upper - result[1].Lower;
        width1.Should().BeGreaterThan(width0);
    }

    // -----------------------------------------------------------------------
    // Clamping
    // -----------------------------------------------------------------------

    [Fact]
    public void Compute_ClampsPercentageToOneHundred()
    {
        // Strong upward trend that would extrapolate above 100.
        var series = new[] { Pt(0, 70m), Pt(1, 80m), Pt(2, 90m) };
        var result = ForecastCalculator.Compute(series, isPercentage: true, steps: 1)!;
        result[0].Upper.Should().BeLessThanOrEqualTo(100m);
    }

    [Fact]
    public void Compute_DoesNotCapCountMetricsAtOneHundred()
    {
        // Count metric with strong upward trend.
        var series = new[] { Pt(0, 70m), Pt(1, 80m), Pt(2, 90m) };
        var result = ForecastCalculator.Compute(series, isPercentage: false, steps: 1)!;
        result[0].Upper.Should().BeGreaterThanOrEqualTo(100m);
    }

    [Fact]
    public void Compute_FloorAtZero()
    {
        // Strong downward trend that would extrapolate below 0.
        var series = new[] { Pt(0, 30m), Pt(1, 20m), Pt(2, 10m) };
        var result = ForecastCalculator.Compute(series, isPercentage: false, steps: 1)!;
        result[0].Lower.Should().BeGreaterThanOrEqualTo(0m);
    }

    // -----------------------------------------------------------------------
    // Low-confidence flag
    // -----------------------------------------------------------------------

    [Fact]
    public void Compute_FlagsLowConfidence_WhenSeriesFewerThanThreshold()
    {
        var series = new[] { Pt(0, 10m), Pt(1, 20m), Pt(2, 30m) }; // n=3 < 4
        var result = ForecastCalculator.Compute(series, isPercentage: false, steps: 1)!;
        result[0].IsLowConfidence.Should().BeTrue();
    }

    [Fact]
    public void Compute_DoesNotFlagLowConfidence_WhenSeriesAtThreshold()
    {
        var series = new[] { Pt(0, 10m), Pt(1, 11m), Pt(2, 12m), Pt(3, 13m) }; // n=4
        var result = ForecastCalculator.Compute(series, isPercentage: false, steps: 1)!;
        result[0].IsLowConfidence.Should().BeFalse();
    }

    [Fact]
    public void Compute_AllStepsShareTheSameLowConfidenceFlag()
    {
        var series = new[] { Pt(0, 10m), Pt(1, 20m), Pt(2, 30m) }; // n=3
        var result = ForecastCalculator.Compute(series, isPercentage: false, steps: 3)!;
        result.Should().AllSatisfy(p => p.IsLowConfidence.Should().BeTrue());
    }

    // -----------------------------------------------------------------------
    // LowConfidenceThreshold constant
    // -----------------------------------------------------------------------

    [Fact]
    public void LowConfidenceThreshold_IsFour() =>
        ForecastCalculator.LowConfidenceThreshold.Should().Be(4);
}
