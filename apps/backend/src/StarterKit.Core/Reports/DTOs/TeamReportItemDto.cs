namespace StarterKit.Core.Reports.DTOs;

public sealed class TeamReportItemDto
{
    public Guid TeamId { get; init; }
    public string TeamName { get; init; } = string.Empty;
    public int TotalUsers { get; init; }

    /// <summary>Distinct users who played at least once in the period.</summary>
    public int ActiveUsers { get; init; }

    /// <summary>Distinct active users ÷ total users × 100. Did they engage at all?</summary>
    public decimal ParticipationRate { get; init; }

    /// <summary>Average daily active players ÷ total users × 100. How intensely did they play?</summary>
    public decimal ActivityRate { get; init; }
    public int TotalSessions { get; init; }
    public decimal AverageAccuracy { get; init; }
    public bool IsAnomaly { get; init; }
}
