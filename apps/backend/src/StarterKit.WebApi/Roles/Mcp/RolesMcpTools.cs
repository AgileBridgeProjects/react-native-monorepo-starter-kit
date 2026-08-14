using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using ModelContextProtocol.Server;
using StarterKit.Auth.Permissions;
using StarterKit.Auth.Transformers;
using StarterKit.Core.Roles;
using StarterKit.Core.Roles.Interfaces.Services;
using StarterKit.WebApi.Common;
using StarterKit.WebApi.Roles.DTOs;
using StarterKit.WebApi.Roles.Mappers;

namespace StarterKit.WebApi.Roles.Mcp;

/// <summary>MCP tools mirroring <see cref="RolesController"/> 1:1.</summary>
[McpServerToolType]
public sealed class RolesMcpTools(
    IRoleService roleService,
    IHttpContextAccessor httpContextAccessor
)
{
    [McpServerTool(Name = "roles_list", ReadOnly = true)]
    [Authorize(Policy = StarterKitPermissions.Roles.View)]
    [Description(
        "Returns roles with their assigned permissions. By default returns active roles only; SuperAdmins may include inactive roles. SuperAdmins see every role; ClubAdmins see all roles except SuperAdmin."
    )]
    public async Task<RoleListResponse> ListAsync(
        [Description("Include deactivated roles (honoured for SuperAdmins only).")]
            bool includeInactive = false,
        CancellationToken cancellationToken = default
    )
    {
        var isSuperAdmin =
            httpContextAccessor.HttpContext?.User.HasClaim(
                RoleClaimsTransformer.PermissionClaimType,
                StarterKitPermissions.Platform.Admin
            ) ?? false;

        // Non-SuperAdmins cannot request inactive roles.
        var resolvedIncludeInactive = isSuperAdmin && includeInactive;

        var roles = await roleService.ListAsync(
            isSuperAdmin: isSuperAdmin,
            includeInactive: resolvedIncludeInactive,
            cancellationToken
        );

        return new RoleListResponse { Items = roles.Select(r => r.ToResponse()).ToList() };
    }

    [McpServerTool(Name = "roles_get_permissions", ReadOnly = true)]
    [Authorize(Policy = StarterKitPermissions.Roles.View)]
    [Description("Returns all platform permissions grouped by permission group.")]
    public IReadOnlyList<PermissionGroupResponse> GetPermissions()
    {
        return PermissionKeyFormatter
            .GetGroupedPermissions()
            .Select(g => new PermissionGroupResponse
            {
                Group = g.Group,
                Permissions = g
                    .Permissions.Select(p => new PermissionItemResponse
                    {
                        Key = p.Key,
                        Description = p.Description,
                    })
                    .ToList(),
            })
            .ToList();
    }

    [McpServerTool(Name = "roles_get_by_id", ReadOnly = true)]
    [Authorize(Policy = StarterKitPermissions.Roles.View)]
    [Description("Returns a single role with its permissions.")]
    public async Task<RoleResponse> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var role = await roleService.GetByIdAsync(id, cancellationToken);
        return role.ToResponse();
    }

    [McpServerTool(Name = "roles_create")]
    [Authorize(Policy = StarterKitPermissions.Roles.Manage)]
    [Description("Creates a new role. SuperAdmin only.")]
    public async Task<RoleResponse> CreateAsync(
        CreateRoleRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var role = await roleService.CreateAsync(
            request.Name,
            request.Description,
            request.IsElevated,
            request.IsPortalRole,
            request.ClubId,
            cancellationToken
        );
        return role.ToResponse();
    }

    [McpServerTool(Name = "roles_update", Idempotent = true)]
    [Authorize(Policy = StarterKitPermissions.Roles.Manage)]
    [Description("Updates the name and description of a role. SuperAdmin only.")]
    public async Task<RoleResponse> UpdateAsync(
        Guid id,
        UpdateRoleRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var role = await roleService.UpdateAsync(
            id,
            request.Name,
            request.Description,
            request.IsElevated,
            request.IsPortalRole,
            request.ClubId,
            cancellationToken
        );
        return role.ToResponse();
    }

    [McpServerTool(Name = "roles_deactivate", Destructive = true)]
    [Authorize(Policy = StarterKitPermissions.Roles.Manage)]
    [Description(
        "Deactivates a role. System roles and roles with active users cannot be deactivated. SuperAdmin only."
    )]
    public async Task DeactivateAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await roleService.DeactivateAsync(id, cancellationToken);
    }

    [McpServerTool(Name = "roles_activate", Idempotent = true)]
    [Authorize(Policy = StarterKitPermissions.Roles.Manage)]
    [Description("Reactivates a previously deactivated role. SuperAdmin only.")]
    public async Task ActivateAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await roleService.ActivateAsync(id, cancellationToken);
    }

    [McpServerTool(Name = "roles_update_permissions", Idempotent = true)]
    [Authorize(Policy = StarterKitPermissions.Roles.Manage)]
    [Description("Replaces the full permission set for a role. SuperAdmin only.")]
    public async Task<RoleResponse> UpdatePermissionsAsync(
        Guid id,
        UpdateRolePermissionsRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var role = await roleService.UpdatePermissionsAsync(
            id,
            request.Permissions,
            cancellationToken
        );
        return role.ToResponse();
    }

    [McpServerTool(Name = "roles_get_assignments", ReadOnly = true)]
    [Authorize(Policy = StarterKitPermissions.Roles.Manage)]
    [Description("Returns a paged list of users currently assigned to a role.")]
    public async Task<PagedResponse<RoleUserAssignmentResponse>> GetAssignmentsAsync(
        Guid id,
        [Description("Paging, sorting and free-text filter options.")] RoleAssignmentsQuery query,
        CancellationToken cancellationToken = default
    )
    {
        var result = await roleService.GetAssignmentsAsync(id, query, cancellationToken);
        return new PagedResponse<RoleUserAssignmentResponse>
        {
            Items = result
                .Items.Select(a => new RoleUserAssignmentResponse
                {
                    UserId = a.UserId,
                    DisplayName = a.DisplayName,
                    Email = a.Email,
                    ClubId = a.ClubId,
                    ClubName = a.ClubName,
                })
                .ToList(),
            TotalCount = result.TotalCount,
            Page = result.Page,
            PageSize = result.PageSize,
            HasNextPage = result.HasNextPage,
        };
    }
}
