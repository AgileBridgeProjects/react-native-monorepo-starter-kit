using StarterKit.Core.Auth.Mappers;
using StarterKit.Core.Common;
using StarterKit.Core.Models;
using StarterKit.Core.Roles.Interfaces.Services;
using StarterKit.Data.Exceptions;
using StarterKit.Data.Persistence.Entities;
using StarterKit.Data.Roles.Interfaces.Repositories;
using StarterKit.Data.Roles.Models;

namespace StarterKit.Core.Roles.Services;

public sealed class RoleService(IRoleRepository roleRepository) : IRoleService
{
    public async Task<IReadOnlyList<Role>> ListAsync(
        bool isSuperAdmin,
        bool includeInactive = false,
        CancellationToken cancellationToken = default
    )
    {
        var entities = await roleRepository.ListAsync(
            excludeSystemRoles: !isSuperAdmin,
            includeInactive: includeInactive,
            cancellationToken
        );
        return entities.Select(r => r.ToModel()).ToList();
    }

    public async Task<Role> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity =
            await roleRepository.GetAsync(id, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Role), id);
        return entity.ToModel();
    }

    public async Task<Role> CreateAsync(
        string name,
        string? description,
        bool isElevated,
        bool isPortalRole,
        Guid? clubId,
        CancellationToken cancellationToken = default
    )
    {
        var existing = await roleRepository.FindByNameAsync(name, cancellationToken);
        if (existing is not null)
            throw new ConflictException($"A role with the name '{name}' already exists.");

        var entity = new RoleEntity
        {
            Id = Guid.NewGuid(),
            Name = name,
            Description = description,
            IsActive = true,
            IsElevated = isElevated,
            IsPortalRole = isPortalRole,
            ClubId = clubId,
        };

        var created = await roleRepository.CreateAsync(entity, cancellationToken);
        return created.ToModel();
    }

    public async Task<Role> UpdateAsync(
        Guid id,
        string name,
        string? description,
        bool isElevated,
        bool isPortalRole,
        Guid? clubId,
        CancellationToken cancellationToken = default
    )
    {
        var existing =
            await roleRepository.GetAsync(id, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Role), id);

        if (!string.Equals(existing.Name, name, StringComparison.Ordinal))
        {
            var nameConflict = await roleRepository.FindByNameAsync(name, cancellationToken);
            if (nameConflict is not null)
                throw new ConflictException($"A role with the name '{name}' already exists.");
        }

        var updated = await roleRepository.UpdateAsync(
            id,
            name,
            description,
            isElevated,
            isPortalRole,
            clubId,
            cancellationToken
        );

        return updated.ToModel();
    }

    public async Task DeactivateAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity =
            await roleRepository.GetAsync(id, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Role), id);

        if (entity.IsSystem)
            throw new ConflictException(
                "System roles cannot be deactivated.",
                errorCode: "system-role"
            );

        var hasAssignments = await roleRepository.HasActiveAssignmentsAsync(id, cancellationToken);
        if (hasAssignments)
            throw new ConflictException(
                "This role still has users assigned to it. Reassign all users before deactivating.",
                errorCode: "role-has-active-users"
            );

        await roleRepository.DeactivateAsync(id, cancellationToken);
    }

    public async Task ActivateAsync(Guid id, CancellationToken cancellationToken = default)
    {
        _ =
            await roleRepository.GetAsync(id, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Role), id);

        await roleRepository.ActivateAsync(id, cancellationToken);
    }

    public async Task<Role> UpdatePermissionsAsync(
        Guid id,
        IReadOnlyList<string> permissions,
        CancellationToken cancellationToken = default
    )
    {
        var updated = await roleRepository.ReplacePermissionsAsync(
            id,
            permissions,
            cancellationToken
        );
        return updated.ToModel();
    }

    public async Task<IPagedResult<RoleUserAssignmentProjection>> GetAssignmentsAsync(
        Guid roleId,
        RoleAssignmentsQuery query,
        CancellationToken cancellationToken = default
    )
    {
        _ =
            await roleRepository.GetAsync(roleId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Role), roleId);

        var (items, totalCount) = await roleRepository.GetAssignmentsAsync(
            roleId,
            query.ClampedPage,
            query.ClampedPageSize,
            cancellationToken
        );

        return new PagedResult<RoleUserAssignmentProjection>
        {
            Items = items,
            TotalCount = totalCount,
            Page = query.ClampedPage,
            PageSize = query.ClampedPageSize,
        };
    }
}
