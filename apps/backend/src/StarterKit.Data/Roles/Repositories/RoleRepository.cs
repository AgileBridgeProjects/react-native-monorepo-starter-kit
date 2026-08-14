using Microsoft.EntityFrameworkCore;
using StarterKit.Data.Exceptions;
using StarterKit.Data.Persistence;
using StarterKit.Data.Persistence.Entities;
using StarterKit.Data.Roles.Interfaces.Repositories;
using StarterKit.Data.Roles.Models;

namespace StarterKit.Data.Roles.Repositories;

internal sealed class RoleRepository(AppDbContext db) : IRoleRepository
{
    public async Task<IReadOnlyList<RoleEntity>> ListAsync(
        bool excludeSystemRoles,
        bool includeInactive,
        CancellationToken cancellationToken
    )
    {
        IQueryable<RoleEntity> query = db.Roles.AsNoTracking().Include(r => r.RolePermissions);

        if (excludeSystemRoles)
            query = query.Where(r => !r.IsSystem);

        if (!includeInactive)
            query = query.Where(r => r.IsActive);

        return await query.OrderBy(r => r.Name).ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<string>> ListNamesForClubAsync(
        Guid clubId,
        CancellationToken cancellationToken
    ) =>
        await db
            .Roles.AsNoTracking()
            .Where(r => r.IsActive && (r.ClubId == null || r.ClubId == clubId))
            .OrderBy(r => r.Name)
            .Select(r => r.Name)
            .ToListAsync(cancellationToken);

    public Task<bool> HasActiveAssignmentsAsync(Guid roleId, CancellationToken cancellationToken) =>
        db.UserRoleAssignments.AnyAsync(ura => ura.RoleId == roleId, cancellationToken);

    public async Task<(
        IReadOnlyList<RoleUserAssignmentProjection> Items,
        int TotalCount
    )> GetAssignmentsAsync(Guid roleId, int page, int pageSize, CancellationToken cancellationToken)
    {
        var query = db
            .UserRoleAssignments.Where(ura => ura.RoleId == roleId)
            .Select(ura => new RoleUserAssignmentProjection
            {
                UserId = ura.UserId,
                DisplayName = ura.User.DisplayName,
                Email = ura.User.Email,
                ClubId = ura.User.ClubId,
                ClubName = ura.User.Club.Name,
            })
            .OrderBy(u => u.DisplayName);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public Task<RoleEntity?> GetAsync(Guid id, CancellationToken cancellationToken) =>
        db
            .Roles.AsNoTracking()
            .Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

    public Task<RoleEntity?> FindByNameAsync(string name, CancellationToken cancellationToken) =>
        db.Roles.AsNoTracking().FirstOrDefaultAsync(r => r.Name == name, cancellationToken);

    public Task<RoleEntity?> FindDefaultRoleAsync(CancellationToken cancellationToken) =>
        db
            .Roles.AsNoTracking()
            .FirstOrDefaultAsync(
                r => r.IsDefault && r.IsActive && r.ClubId == null,
                cancellationToken
            );

    public async Task<RoleEntity> CreateAsync(
        RoleEntity entity,
        CancellationToken cancellationToken
    )
    {
        db.Roles.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task<RoleEntity> UpdateAsync(
        Guid id,
        string name,
        string? description,
        bool isElevated,
        bool isPortalRole,
        Guid? clubId,
        CancellationToken cancellationToken
    )
    {
        await db
            .Roles.Where(r => r.Id == id)
            .ExecuteUpdateAsync(
                s =>
                    s.SetProperty(r => r.Name, name)
                        .SetProperty(r => r.Description, description)
                        .SetProperty(r => r.IsElevated, isElevated)
                        .SetProperty(r => r.IsPortalRole, isPortalRole)
                        .SetProperty(r => r.ClubId, clubId),
                cancellationToken
            );

        return await db
            .Roles.AsNoTracking()
            .Include(r => r.RolePermissions)
            .FirstAsync(r => r.Id == id, cancellationToken);
    }

    public async Task DeactivateAsync(Guid id, CancellationToken cancellationToken) =>
        await db
            .Roles.Where(r => r.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(r => r.IsActive, false), cancellationToken);

    public async Task ActivateAsync(Guid id, CancellationToken cancellationToken) =>
        await db
            .Roles.Where(r => r.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(r => r.IsActive, true), cancellationToken);

    public async Task<RoleEntity> ReplacePermissionsAsync(
        Guid roleId,
        IReadOnlyList<string> permissions,
        CancellationToken cancellationToken
    )
    {
        // Bulk-delete existing permissions directly in the database to avoid
        // EF Core change-tracker concurrency issues with Clear() + Add().
        await db
            .RolePermissions.Where(rp => rp.RoleId == roleId)
            .ExecuteDeleteAsync(cancellationToken);

        foreach (var permission in permissions)
        {
            db.RolePermissions.Add(
                new RolePermissionEntity
                {
                    Id = Guid.NewGuid(),
                    RoleId = roleId,
                    Permission = permission,
                }
            );
        }

        await db.SaveChangesAsync(cancellationToken);

        // Re-fetch the full entity with the new permissions for the caller.
        var entity = await db
            .Roles.Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.Id == roleId, cancellationToken);

        return entity ?? throw new EntityNotFoundException(nameof(RoleEntity), roleId);
    }

    public Task<bool> AssignmentExistsAsync(
        Guid userId,
        Guid roleId,
        CancellationToken cancellationToken
    ) =>
        db.UserRoleAssignments.AnyAsync(
            ura => ura.UserId == userId && ura.RoleId == roleId,
            cancellationToken
        );

    public async Task CreateAssignmentAsync(
        UserRoleAssignmentEntity assignment,
        CancellationToken cancellationToken
    )
    {
        await db.UserRoleAssignments.AddAsync(assignment, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<string>> GetRoleNamesForUserAsync(
        Guid userId,
        CancellationToken cancellationToken
    ) =>
        await db
            .UserRoleAssignments.Where(ura => ura.UserId == userId)
            .Select(ura => ura.Role.Name)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlySet<string>> GetPermissionsForUserAsync(
        Guid userId,
        CancellationToken cancellationToken
    )
    {
        var permissions = await db
            .UserRoleAssignments.Where(ura => ura.UserId == userId)
            .SelectMany(ura => ura.Role.RolePermissions)
            .Select(rp => rp.Permission)
            .Distinct()
            .ToListAsync(cancellationToken);

        return permissions.ToHashSet();
    }

    public async Task<IReadOnlySet<Guid>> ListUserIdsWithPermissionAsync(
        IReadOnlyList<Guid> userIds,
        string permission,
        CancellationToken cancellationToken
    )
    {
        if (userIds.Count == 0)
            return new HashSet<Guid>();

        var permitted = await db
            .UserRoleAssignments.Where(ura => userIds.Contains(ura.UserId))
            .Where(ura => ura.Role.RolePermissions.Any(rp => rp.Permission == permission))
            .Select(ura => ura.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);

        return permitted.ToHashSet();
    }

    public async Task RemoveAssignmentsForUserAsync(
        Guid userId,
        CancellationToken cancellationToken
    )
    {
        var assignments = await db
            .UserRoleAssignments.Where(a => a.UserId == userId)
            .ToListAsync(cancellationToken);

        db.UserRoleAssignments.RemoveRange(assignments);
        await db.SaveChangesAsync(cancellationToken);
    }
}
