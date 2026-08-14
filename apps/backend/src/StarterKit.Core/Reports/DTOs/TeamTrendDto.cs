namespace StarterKit.Core.Reports.DTOs;

public sealed class TeamTrendDto
{
    public Guid TeamId { get; init; }
    public string TeamName { get; init; } = string.Empty;
    public IReadOnlyList<TrendPointDto> Points { get; init; } = [];
    public IReadOnlyList<ForecastPointDto> Forecast { get; init; } = [];
}
