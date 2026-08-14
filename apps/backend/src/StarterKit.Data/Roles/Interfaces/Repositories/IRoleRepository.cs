using StarterKit.Data.Persistence.Entities;
using StarterKit.Data.Roles.Models;

namespace StarterKit.Data.Roles.Interfaces.Repositories;

public interface IRoleRepository
{
    Task<IReadOnlyList<RoleEntity>> ListAsync(
        bool excludeSystemRoles,
        bool includeInactive,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Returns the names of all active roles visible to <paramref name="clubId"/>:
    /// global roles (<c>ClubId IS NULL</c>) plus roles created for that specific club.
    /// </summary>
    Task<IReadOnlyList<string>> ListNamesForClubAsync(
        Guid clubId,
        CancellationToken cancellationToken
    );

    /// <summary>Returns true if any user is currently assigned to the given role.</summary>
    Task<bool> HasActiveAssignmentsAsync(Guid roleId, CancellationToken cancellationToken);

    /// <summary>Returns a paged list of users currently assigned to the given role with their club details.</summary>
    Task<(IReadOnlyList<RoleUserAssignmentProjection> Items, int TotalCount)> GetAssignmentsAsync(
        Guid roleId,
        int page,
        int pageSize,
        CancellationToken cancellationToken
    );

    Task<RoleEntity?> GetAsync(Guid id, CancellationToken cancellationToken);

    Task<RoleEntity?> FindByNameAsync(string name, CancellationToken cancellationToken);

    /// <summary>Returns the role flagged as the default for new users, or null if none is set.</summary>
    Task<RoleEntity?> FindDefaultRoleAsync(CancellationToken cancellationToken);

    Task<RoleEntity> CreateAsync(RoleEntity entity, CancellationToken cancellationToken);

    Task<RoleEntity> UpdateAsync(
        Guid id,
        string name,
        string? description,
        bool isElevated,
        bool isPortalRole,
        Guid? clubId,
        CancellationToken cancellationToken
    );

    Task DeactivateAsync(Guid id, CancellationToken cancellationToken);

    Task ActivateAsync(Guid id, CancellationToken cancellationToken);

    Task<RoleEntity> ReplacePermissionsAsync(
        Guid roleId,
        IReadOnlyList<string> permissions,
        CancellationToken cancellationToken
    );

    Task<bool> AssignmentExistsAsync(Guid userId, Guid roleId, CancellationToken cancellationToken);

    Task CreateAssignmentAsync(
        UserRoleAssignmentEntity assignment,
        CancellationToken cancellationToken
    );

    Task<IReadOnlyList<string>> GetRoleNamesForUserAsync(
        Guid userId,
        CancellationToken cancellationToken
    );

    Task<IReadOnlySet<string>> GetPermissionsForUserAsync(
        Guid userId,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Bulk variant of <see cref="GetPermissionsForUserAsync"/> — returns the subset of
    /// <paramref name="userIds"/> that currently hold <paramref name="permission"/>, in one
    /// query rather than one call per user. Backs re-checks against a batch of users (e.g.
    /// <c>CheckInReminderJob</c> confirming access hasn't been revoked since a config was
    /// seeded/updated).
    /// </summary>
    Task<IReadOnlySet<Guid>> ListUserIdsWithPermissionAsync(
        IReadOnlyList<Guid> userIds,
        string permission,
        CancellationToken cancellationToken
    );

    /// <summary>Removes all role assignments for a user.</summary>
    Task RemoveAssignmentsForUserAsync(Guid userId, CancellationToken cancellationToken);
}
