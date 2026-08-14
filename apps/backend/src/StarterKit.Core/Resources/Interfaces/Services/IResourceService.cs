using StarterKit.Core.Common;
using StarterKit.Data.Resources.Enums;
using StarterKit.Data.Resources.Models;

namespace StarterKit.Core.Resources.Interfaces.Services;

public interface IResourceService
{
    Task<PagedResult<Resource>> ListAsync(
        ResourceListQuery query,
        CancellationToken cancellationToken = default
    );
    Task<Resource> GetAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Resource?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Resource> CreateAsync(
        string title,
        ResourceSourceType sourceType,
        UploadedFile file,
        CancellationToken cancellationToken = default
    );
    Task<Resource> UpdateAsync(
        Guid id,
        string title,
        ResourceSourceType sourceType,
        UploadedFile file,
        CancellationToken cancellationToken = default
    );
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
