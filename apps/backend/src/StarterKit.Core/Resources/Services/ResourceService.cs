using Microsoft.Extensions.Logging;
using StarterKit.Core.Common;
using StarterKit.Core.Resources.Interfaces.Services;
using StarterKit.Core.Storage;
using StarterKit.Core.Storage.Interfaces;
using StarterKit.Data.Resources.Enums;
using StarterKit.Data.Resources.Interfaces.Repositories;
using StarterKit.Data.Resources.Models;

namespace StarterKit.Core.Resources.Services;

public class ResourceService : IResourceService
{
    private readonly IResourceRepository _resourceRepository;
    private readonly IBlobStorageService _blobStorageService;
    private readonly ILogger<ResourceService> _logger;

    public ResourceService(
        IResourceRepository resourceRepository,
        IBlobStorageService blobStorageService,
        ILogger<ResourceService> logger
    )
    {
        _resourceRepository = resourceRepository;
        _blobStorageService = blobStorageService;
        _logger = logger;
    }

    public async Task<PagedResult<Resource>> ListAsync(
        ResourceListQuery query,
        CancellationToken cancellationToken = default
    )
    {
        var (items, totalCount) = await _resourceRepository.ListAsync(
            query.ClampedPage,
            query.ClampedPageSize,
            filterText: query.FilterText,
            cancellationToken: cancellationToken
        );

        return new PagedResult<Resource>
        {
            Items = items,
            TotalCount = totalCount,
            Page = query.ClampedPage,
            PageSize = query.ClampedPageSize,
        };
    }

    public async Task<Resource> GetAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _resourceRepository.GetAsync(id, cancellationToken);
    }

    public async Task<Resource?> FindByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        return await _resourceRepository.FindByIdAsync(id, cancellationToken);
    }

    public async Task<Resource> CreateAsync(
        string title,
        ResourceSourceType sourceType,
        UploadedFile file,
        CancellationToken cancellationToken = default
    )
    {
        var result = await _blobStorageService.UploadAsync(
            BlobContainerName.Resources,
            file,
            cancellationToken
        );

        _logger.LogInformation(
            "Uploaded resource blob {BlobPath} (sourceType: {SourceType})",
            result.StoredPath,
            sourceType
        );

        var resource = new Resource
        {
            Id = result.Id,
            Title = title,
            SourceType = sourceType,
            StorageUrl = result.StoredPath,
        };

        await _resourceRepository.AddAsync(resource, cancellationToken);

        _logger.LogInformation("Created resource {ResourceId}", result.Id);

        return resource;
    }

    public async Task<Resource> UpdateAsync(
        Guid id,
        string title,
        ResourceSourceType sourceType,
        UploadedFile file,
        CancellationToken cancellationToken = default
    )
    {
        var resource = await _resourceRepository.GetAsync(id, cancellationToken);

        var blobName = BlobName.ForEntity(id, file.FileName);

        _logger.LogInformation(
            "Replacing resource blob {BlobName} for resource {ResourceId}",
            blobName,
            id
        );

        resource.Title = title;
        resource.SourceType = sourceType;
        resource.StorageUrl = await _blobStorageService.UploadAsync(
            BlobContainerName.Resources,
            blobName,
            file,
            cancellationToken
        );

        await _resourceRepository.UpdateAsync(resource, cancellationToken);

        return resource;
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Deleting resource {ResourceId}", id);
        await _resourceRepository.DeleteAsync(id, cancellationToken);
    }
}
