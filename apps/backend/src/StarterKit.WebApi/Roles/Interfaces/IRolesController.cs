using Microsoft.AspNetCore.Mvc;
using StarterKit.Core.Roles;
using StarterKit.WebApi.Common;
using StarterKit.WebApi.Roles.DTOs;

namespace StarterKit.WebApi.Roles.Interfaces;

public interface IRolesController
{
    Task<ActionResult<RoleListResponse>> ListAsync(
        bool includeInactive,
        CancellationToken cancellationToken
    );

    ActionResult<IReadOnlyList<PermissionGroupResponse>> GetPermissions();

    Task<ActionResult<RoleResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<ActionResult<RoleResponse>> CreateAsync(
        [FromBody] CreateRoleRequest request,
        CancellationToken cancellationToken
    );

    Task<ActionResult<RoleResponse>> UpdateAsync(
        Guid id,
        [FromBody] UpdateRoleRequest request,
        CancellationToken cancellationToken
    );

    Task<IActionResult> DeactivateAsync(Guid id, CancellationToken cancellationToken);

    Task<IActionResult> ActivateAsync(Guid id, CancellationToken cancellationToken);

    Task<ActionResult<RoleResponse>> UpdatePermissionsAsync(
        Guid id,
        [FromBody] UpdateRolePermissionsRequest request,
        CancellationToken cancellationToken
    );

    Task<ActionResult<PagedResponse<RoleUserAssignmentResponse>>> GetAssignmentsAsync(
        Guid id,
        RoleAssignmentsQuery query,
        CancellationToken cancellationToken
    );
}
