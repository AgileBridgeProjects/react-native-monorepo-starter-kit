using System.ComponentModel.DataAnnotations;

namespace StarterKit.WebApi.Seasons.DTOs;

public sealed class CreateSeasonRequest
{
    /// <summary>Optional display name (e.g. "2026 Indoor"). Falls back to a derived date-range label.</summary>
    [MaxLength(100)]
    public string? Name { get; init; }

    [Required]
    public DateOnly StartDate { get; init; }

    [Required]
    public DateOnly EndDate { get; init; }

    /// <summary>
    /// Reserved for a future "clone team structure from prior season" feature. Accepted for API
    /// contract stability but intentionally a no-op for now — no teams are copied.
    /// </summary>
    public Guid? CloneTeamsFromSeasonId { get; init; }
}
