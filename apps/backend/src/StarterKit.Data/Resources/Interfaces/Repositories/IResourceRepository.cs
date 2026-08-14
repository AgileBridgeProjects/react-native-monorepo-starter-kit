using StarterKit.Data.Resources.Models;

namespace StarterKit.Data.Resources.Interfaces.Repositories;

public interface IResourceRepository
{
    Task AddAsync(Resource resource, CancellationToken cancellationToken = default);
    Task<Resource?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Resource> GetAsync(Guid id, CancellationToken cancellationToken = default);
    Task UpdateAsync(Resource resource, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<Resource> Items, int TotalCount)> ListAsync(
        int page,
        int pageSize,
        string? filterText = null,
        CancellationToken cancellationToken = default
    );
}
