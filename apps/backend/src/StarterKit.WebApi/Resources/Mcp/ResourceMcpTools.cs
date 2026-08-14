using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using ModelContextProtocol.Server;
using StarterKit.Auth.Permissions;
using StarterKit.Core.Resources.Interfaces.Services;
using StarterKit.WebApi.Resources.DTOs;
using StarterKit.WebApi.Resources.Mappers;
using CoreResourceListQuery = StarterKit.Core.Resources.ResourceListQuery;

namespace StarterKit.WebApi.Resources.Mcp;

/// <summary>MCP tools mirroring <see cref="ResourceController"/> 1:1.</summary>
// Not MCP-exposed: CreateAsync and UpdateAsync — multipart IFormFile uploads do not map to
// MCP tool JSON.
[McpServerToolType]
public sealed class ResourceMcpTools(IResourceService resourceService)
{
    [McpServerTool(Name = "resources_list", ReadOnly = true)]
    [Authorize(Policy = StarterKitPermissions.Resources.View)]
    [Description("Returns a paginated list of resources.")]
    public async Task<ResourceListResponse> ListAsync(
        [Description("Paging, sorting and free-text filter options.")] ResourceListQuery query,
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

        return new ResourceListResponse
        {
            Items = result.Items.Select(r => r.ToResponse()).ToList(),
            TotalCount = result.TotalCount,
            Page = result.Page,
            PageSize = result.PageSize,
            HasNextPage = result.HasNextPage,
        };
    }

    [McpServerTool(Name = "resources_get_by_id", ReadOnly = true)]
    [Authorize(Policy = StarterKitPermissions.Resources.View)]
    [Description("Returns a single resource by ID.")]
    public async Task<ResourceResponse> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var resource = await resourceService.GetAsync(id, cancellationToken);

        return resource.ToResponse();
    }

    [McpServerTool(Name = "resources_delete", Destructive = true)]
    [Authorize(Policy = StarterKitPermissions.Resources.Manage)]
    [Description("Soft-deletes a resource.")]
    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await resourceService.DeleteAsync(id, cancellationToken);
    }
}
