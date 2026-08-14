using Microsoft.AspNetCore.Mvc;
using StarterKit.WebApi.Resources.DTOs;

namespace StarterKit.WebApi.Resources.Interfaces;

public interface IResourceController
{
    Task<ActionResult<ResourceListResponse>> ListAsync(
        [FromQuery] ResourceListQuery query,
        CancellationToken cancellationToken
    );

    Task<ActionResult<ResourceResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<ActionResult<ResourceResponse>> CreateAsync(
        [FromForm] CreateResourceRequest request,
        CancellationToken cancellationToken
    );

    Task<ActionResult<ResourceResponse>> UpdateAsync(
        Guid id,
        [FromForm] UpdateResourceRequest request,
        CancellationToken cancellationToken
    );

    Task<ActionResult> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
