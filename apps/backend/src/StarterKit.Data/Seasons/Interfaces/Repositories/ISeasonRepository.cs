using StarterKit.Data.Seasons.Models;

namespace StarterKit.Data.Seasons.Interfaces.Repositories;

public interface ISeasonRepository
{
    Task AddAsync(Season season, CancellationToken cancellationToken = default);
    Task<Season?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Season> GetAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Finds the season for <paramref name="clubId"/> whose date range contains <paramref name="date"/>,
    /// or <c>null</c> if none exists.
    /// </summary>
    Task<Season?> FindCurrentAsync(
        Guid clubId,
        DateOnly date,
        CancellationToken cancellationToken = default
    );

    Task<IReadOnlyList<Season>> ListByClubAsync(
        Guid clubId,
        CancellationToken cancellationToken = default
    );
}
