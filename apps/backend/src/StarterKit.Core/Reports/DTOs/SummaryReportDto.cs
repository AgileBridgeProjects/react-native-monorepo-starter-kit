namespace StarterKit.Core.Reports.DTOs;

public sealed record SummaryReportDto
{
    public DateOnly DateFrom { get; init; }
    public DateOnly DateTo { get; init; }
    public decimal ParticipationRate { get; init; }
    public decimal ParticipationRateDelta { get; init; }
    public int TotalActivePlayers { get; init; }
    public int TotalActivePlayersDelta { get; init; }
    public int TotalSessions { get; init; }
    public int TotalSessionsDelta { get; init; }
    public decimal AverageAccuracy { get; init; }
    public decimal AverageAccuracyDelta { get; init; }
    public int TotalCompletions { get; init; }
    public decimal TotalCompletionsDelta { get; init; }
}
