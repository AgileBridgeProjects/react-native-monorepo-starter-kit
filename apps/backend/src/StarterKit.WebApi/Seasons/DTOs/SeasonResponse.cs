namespace StarterKit.WebApi.Seasons.DTOs;

public sealed record SeasonResponse
{
    public Guid Id { get; init; }
    public Guid ClubId { get; init; }
    public string? Name { get; init; }
    public DateOnly StartDate { get; init; }
    public DateOnly EndDate { get; init; }

    /// <summary>Display label: <see cref="Name"/> when set, otherwise derived from the date range.</summary>
    public string DisplayLabel { get; init; } = string.Empty;
}
