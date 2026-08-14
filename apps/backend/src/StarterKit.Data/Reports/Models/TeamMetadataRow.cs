namespace StarterKit.Data.Reports.Models;

public sealed class TeamMetadataRow
{
    public Guid TeamId { get; init; }
    public string TeamName { get; init; } = string.Empty;
    public int TotalUsers { get; init; }
}
