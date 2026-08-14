namespace StarterKit.Data.Reports.Models;

public sealed class TeamReportRow
{
    public Guid TeamId { get; init; }
    public string TeamName { get; init; } = string.Empty;
    public int TotalUsers { get; init; }

    /// <summary>Distinct users who had at least one session in the period (participation rate numerator).</summary>
    public int ActiveUsers { get; init; }

    /// <summary>Average daily active players in the period (activity rate numerator). Set post-query from player snapshots.</summary>
    public int AvgDailyActivePlayers { get; set; }
    public int TotalSessions { get; init; }
    public int CorrectAnswers { get; init; }
    public int TotalAnswers { get; init; }
}
