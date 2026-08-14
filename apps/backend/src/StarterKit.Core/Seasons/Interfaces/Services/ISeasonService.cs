using StarterKit.Data.Seasons.Models;

namespace StarterKit.Core.Seasons.Interfaces.Services;

public interface ISeasonService
{
    Task<Season> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<Season?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns the club's current season (whose date range contains today), creating a
    /// default calendar-year season for the club if none exists yet.
    /// </summary>
    Task<Season> GetOrCreateCurrentAsync(
        Guid clubId,
        CancellationToken cancellationToken = default
    );

    Task<IReadOnlyList<Season>> ListByClubAsync(
        Guid clubId,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Explicitly creates a new season for a club (used at club onboarding and from the
    /// "Add Season" admin action) — unlike <see cref="GetOrCreateCurrentAsync"/>, the dates
    /// are always caller-supplied rather than defaulted to a calendar year.
    /// </summary>
    /// <param name="cloneTeamsFromSeasonId">
    /// Reserved for a future "clone team structure from prior season" feature. Accepted so the
    /// API contract is stable, but intentionally a no-op for now — no teams are copied.
    /// </param>
    Task<Season> CreateAsync(
        Guid clubId,
        string? name,
        DateOnly startDate,
        DateOnly endDate,
        Guid? cloneTeamsFromSeasonId = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Returns the season's display label: <see cref="Season.Name"/> when set, otherwise a
    /// label derived from its date range (e.g. "2026 Season").
    /// </summary>
    string GetDisplayLabel(Season season);
}
