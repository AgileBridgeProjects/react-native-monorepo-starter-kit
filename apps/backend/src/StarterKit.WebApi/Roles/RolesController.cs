using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StarterKit.Auth.Permissions;
using StarterKit.Auth.Transformers;
using StarterKit.Core.Roles;
using StarterKit.Core.Roles.Interfaces.Services;
using StarterKit.WebApi.Common;
using StarterKit.WebApi.Roles.DTOs;
using StarterKit.WebApi.Roles.Interfaces;
using StarterKit.WebApi.Roles.Mappers;

namespace StarterKit.WebApi.Roles;

[ApiController]
[Route("api/roles")]
[Tags("Roles")]
[Authorize]
public sealed class RolesController(IRoleService roleService) : ControllerBase, IRolesController
{
    /// <summary>
    /// Returns roles with their assigned permissions.
    /// By default returns active roles only. SuperAdmins may pass ?includeInactive=true.
    /// SuperAdmins see every role; ClubAdmins see all roles except SuperAdmin.
    /// </summary>
    [HttpGet]
    [Authorize(Policy = StarterKitPermissions.Roles.View)]
    [ProducesResponseType(typeof(RoleListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<RoleListResponse>> ListAsync(
        [FromQuery] bool includeInactive = false,
        CancellationToken cancellationToken = default
    )
    {
        var isSuperAdmin = User.HasClaim(
            RoleClaimsTransformer.PermissionClaimType,
            StarterKitPermissions.Platform.Admin
        );

        // Non-SuperAdmins cannot request inactive roles.
        var resolvedIncludeInactive = isSuperAdmin && includeInactive;

        var roles = await roleService.ListAsync(
            isSuperAdmin: isSuperAdmin,
            includeInactive: resolvedIncludeInactive,
            cancellationToken
        );

        return Ok(new RoleListResponse { Items = roles.Select(r => r.ToResponse()).ToList() });
    }

    /// <summary>
    /// Returns all platform permissions grouped by permission group.
    /// Derived from the static <see cref="StarterKitPermissions"/> constants.
    /// </summary>
    [HttpGet("permissions")]
    [Authorize(Policy = StarterKitPermissions.Roles.View)]
    [ProducesResponseType(typeof(IReadOnlyList<PermissionGroupResponse>), StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<PermissionGroupResponse>> GetPermissions()
    {
        var groups = PermissionKeyFormatter
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

        return Ok(groups);
    }

    /// <summary>Returns a single role with its permissions.</summary>
    [HttpGet("{id:guid}")]
    [Authorize(Policy = StarterKitPermissions.Roles.View)]
    [ProducesResponseType(typeof(RoleResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RoleResponse>> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var role = await roleService.GetByIdAsync(id, cancellationToken);
        return Ok(role.ToResponse());
    }

    /// <summary>Creates a new role. SuperAdmin only.</summary>
    [HttpPost]
    [Authorize(Policy = StarterKitPermissions.Roles.Manage)]
    [ProducesResponseType(typeof(RoleResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<RoleResponse>> CreateAsync(
        [FromBody] CreateRoleRequest request,
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
        var body = role.ToResponse();
        return Created($"/api/roles/{body.Id}", body);
    }

    /// <summary>Updates the name and description of a role. SuperAdmin only.</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = StarterKitPermissions.Roles.Manage)]
    [ProducesResponseType(typeof(RoleResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<RoleResponse>> UpdateAsync(
        Guid id,
        [FromBody] UpdateRoleRequest request,
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
        return Ok(role.ToResponse());
    }

    /// <summary>Deactivates a role. System roles and roles with active users cannot be deactivated. SuperAdmin only.</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = StarterKitPermissions.Roles.Manage)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeactivateAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        await roleService.DeactivateAsync(id, cancellationToken);
        return NoContent();
    }

    /// <summary>Reactivates a previously deactivated role. SuperAdmin only.</summary>
    [HttpPost("{id:guid}/activate")]
    [Authorize(Policy = StarterKitPermissions.Roles.Manage)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ActivateAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        await roleService.ActivateAsync(id, cancellationToken);
        return NoContent();
    }

    /// <summary>Replaces the full permission set for a role. SuperAdmin only.</summary>
    [HttpPut("{id:guid}/permissions")]
    [Authorize(Policy = StarterKitPermissions.Roles.Manage)]
    [ProducesResponseType(typeof(RoleResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RoleResponse>> UpdatePermissionsAsync(
        Guid id,
        [FromBody] UpdateRolePermissionsRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var role = await roleService.UpdatePermissionsAsync(
            id,
            request.Permissions,
            cancellationToken
        );
        return Ok(role.ToResponse());
    }

    /// <summary>
    /// Returns a paged list of users currently assigned to a role.
    /// Used by the frontend to populate the deactivation pre-check modal.
    /// </summary>
    [HttpGet("{id:guid}/assignments")]
    [Authorize(Policy = StarterKitPermissions.Roles.Manage)]
    [ProducesResponseType(
        typeof(PagedResponse<RoleUserAssignmentResponse>),
        StatusCodes.Status200OK
    )]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PagedResponse<RoleUserAssignmentResponse>>> GetAssignmentsAsync(
        Guid id,
        [FromQuery] RoleAssignmentsQuery query,
        CancellationToken cancellationToken = default
    )
    {
        var result = await roleService.GetAssignmentsAsync(id, query, cancellationToken);
        return Ok(
            new PagedResponse<RoleUserAssignmentResponse>
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
            }
        );
    }
}
