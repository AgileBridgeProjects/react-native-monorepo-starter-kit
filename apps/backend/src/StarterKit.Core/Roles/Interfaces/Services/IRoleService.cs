using StarterKit.Core.Common;
using StarterKit.Core.Models;
using StarterKit.Data.Roles.Models;

namespace StarterKit.Core.Roles.Interfaces.Services;

public interface IRoleService
{
    /// <summary>
    /// Returns roles with their permissions. Active roles only by default.
    /// Non-SuperAdmin callers see every role except SuperAdmin itself.
    /// SuperAdmins may pass <paramref name="includeInactive"/> to include deactivated roles.
    /// </summary>
    Task<IReadOnlyList<Role>> ListAsync(
        bool isSuperAdmin,
        bool includeInactive = false,
        CancellationToken cancellationToken = default
    );

    /// <summary>Returns a paged list of users currently assigned to a role.</summary>
    Task<IPagedResult<RoleUserAssignmentProjection>> GetAssignmentsAsync(
        Guid roleId,
        RoleAssignmentsQuery query,
        CancellationToken cancellationToken = default
    );

    Task<Role> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<Role> CreateAsync(
        string name,
        string? description,
        bool isElevated,
        bool isPortalRole,
        Guid? clubId,
        CancellationToken cancellationToken = default
    );

    Task<Role> UpdateAsync(
        Guid id,
        string name,
        string? description,
        bool isElevated,
        bool isPortalRole,
        Guid? clubId,
        CancellationToken cancellationToken = default
    );

    Task DeactivateAsync(Guid id, CancellationToken cancellationToken = default);

    Task ActivateAsync(Guid id, CancellationToken cancellationToken = default);

    Task<Role> UpdatePermissionsAsync(
        Guid id,
        IReadOnlyList<string> permissions,
        CancellationToken cancellationToken = default
    );
}
