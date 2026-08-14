using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using StarterKit.Auth.Permissions;
using StarterKit.Auth.RateLimiting;
using StarterKit.Core.Resources.Interfaces.Services;
using StarterKit.WebApi.Resources.DTOs;
using StarterKit.WebApi.Resources.Interfaces;
using StarterKit.WebApi.Resources.Mappers;
using CoreResourceListQuery = StarterKit.Core.Resources.ResourceListQuery;
using UploadedFile = StarterKit.Core.Resources.UploadedFile;

namespace StarterKit.WebApi.Resources;

[ApiController]
[AllowImpersonation]
[Route("api/resources")]
[Tags("Resources")]
[Authorize]
public sealed class ResourceController(IResourceService resourceService)
    : ControllerBase,
        IResourceController
{
    /// <summary>
    /// Returns a paginated list of resources.
    /// </summary>
    [HttpGet]
    [Authorize(Policy = StarterKitPermissions.Resources.View)]
    [ProducesResponseType(typeof(ResourceListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ResourceListResponse>> ListAsync(
        [FromQuery] ResourceListQuery query,
        CancellationToken cancellationToken = default
    )
    {
        var result = await resourceService.ListAsync(
            new CoreResourceListQuery
            {
                FilterText = query.FilterText,
                Page = query.Page,
                PageSize = query.PageSize,
                SortBy = query.SortBy,
                SortDescending = query.SortDescending,
            },
            cancellationToken
        );

        return Ok(
            new ResourceListResponse
            {
                Items = result.Items.Select(r => r.ToResponse()).ToList(),
                TotalCount = result.TotalCount,
                Page = result.Page,
                PageSize = result.PageSize,
                HasNextPage = result.HasNextPage,
            }
        );
    }

    /// <summary>
    /// Returns a single resource by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [Authorize(Policy = StarterKitPermissions.Resources.View)]
    [ProducesResponseType(typeof(ResourceResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ResourceResponse>> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var resource = await resourceService.GetAsync(id, cancellationToken);

        return Ok(resource.ToResponse());
    }

    /// <summary>
    /// Creates a new resource.
    /// </summary>
    [HttpPost]
    [Consumes("multipart/form-data")]
    [Authorize(Policy = StarterKitPermissions.Resources.Manage)]
    [EnableRateLimiting(RateLimitPolicies.UploadOrImport)]
    [ProducesResponseType(typeof(ResourceResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<ResourceResponse>> CreateAsync(
        [FromForm] CreateResourceRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var resource = await resourceService.CreateAsync(
            request.Title,
            request.SourceType,
            new UploadedFile(
                request.File.FileName,
                request.File.ContentType,
                request.File.Length,
                request.File.OpenReadStream()
            ),
            cancellationToken
        );

        return Created($"/api/resources/{resource.Id}", resource.ToResponse());
    }

    /// <summary>
    /// Updates an existing resource.
    /// </summary>
    [HttpPut("{id:guid}")]
    [Consumes("multipart/form-data")]
    [Authorize(Policy = StarterKitPermissions.Resources.Manage)]
    [EnableRateLimiting(RateLimitPolicies.UploadOrImport)]
    [ProducesResponseType(typeof(ResourceResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<ResourceResponse>> UpdateAsync(
        Guid id,
        [FromForm] UpdateResourceRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var resource = await resourceService.UpdateAsync(
            id,
            request.Title,
            request.SourceType,
            new UploadedFile(
                request.File.FileName,
                request.File.ContentType,
                request.File.Length,
                request.File.OpenReadStream()
            ),
            cancellationToken
        );

        return Ok(resource.ToResponse());
    }

    /// <summary>
    /// Soft-deletes a resource.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = StarterKitPermissions.Resources.Manage)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        await resourceService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
