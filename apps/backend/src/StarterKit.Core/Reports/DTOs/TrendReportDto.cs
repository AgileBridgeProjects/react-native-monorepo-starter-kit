namespace StarterKit.Core.Reports.DTOs;

public sealed record TrendReportDto
{
    public IReadOnlyList<TrendPointDto> ParticipationTrend { get; init; } = [];
    public IReadOnlyList<TrendPointDto> AchievementTrend { get; init; } = [];
    public IReadOnlyList<TrendPointDto> SessionsTrend { get; init; } = [];
    public IReadOnlyList<TrendPointDto> ActivePlayersTrend { get; init; } = [];
    public IReadOnlyList<ForecastPointDto> ParticipationForecast { get; init; } = [];
    public IReadOnlyList<ForecastPointDto> AchievementForecast { get; init; } = [];
    public IReadOnlyList<ForecastPointDto> SessionsForecast { get; init; } = [];
    public IReadOnlyList<ForecastPointDto> ActivePlayersForecast { get; init; } = [];
}
