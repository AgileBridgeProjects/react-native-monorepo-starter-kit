namespace StarterKit.WebApi.Seasons.DTOs;

public sealed record SeasonListResponse
{
    public IReadOnlyList<SeasonResponse> Items { get; init; } = [];
}
