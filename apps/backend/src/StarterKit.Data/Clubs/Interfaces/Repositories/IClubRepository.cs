using StarterKit.Data.Clubs.Models;

namespace StarterKit.Data.Clubs.Interfaces.Repositories;

public interface IClubRepository
{
    Task AddAsync(Club club, CancellationToken cancellationToken = default);
    Task<Club?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Club?> FindByNameAsync(string name, CancellationToken cancellationToken = default);
    Task<Club> GetAsync(Guid id, CancellationToken cancellationToken = default);
    Task UpdateAsync(Club club, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<ClubWithCounts> Items, int TotalCount)> ListAsync(
        int page,
        int pageSize,
        string? filterText = null,
        string? sortBy = null,
        bool sortDescending = false,
        CancellationToken cancellationToken = default
    );
}
