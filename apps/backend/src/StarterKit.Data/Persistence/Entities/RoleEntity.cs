using StarterKit.Data.Auditing;

namespace StarterKit.Data.Persistence.Entities;

[ExcludeFromAuditLog]
public class RoleEntity
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Elevated roles cannot be assigned to users whose identity is shared across
    /// multiple organisations (e.g. SuperAdmin, ClubAdmin).
    /// </summary>
    public bool IsElevated { get; set; }

    /// <summary>
    /// Roles that grant access to the admin portal (e.g. SuperAdmin, ClubAdmin).
    /// </summary>
    public bool IsPortalRole { get; set; }

    /// <summary>
    /// Built-in system roles that cannot be edited or deactivated by admins.
    /// </summary>
    public bool IsSystem { get; set; }

    /// <summary>
    /// The club this role belongs to. Null for system-wide roles.
    /// </summary>
    public Guid? ClubId { get; set; }

    /// <summary>
    /// Marks the role that is automatically assigned to newly created users.
    /// Only one role may have this flag set at any time (enforced by a filtered unique index).
    /// </summary>
    public bool IsDefault { get; set; }

    /// <summary>
    /// Members of this role must complete the mobile onboarding wizard before the
    /// rest of the app is reachable. Currently only the seeded Athlete system role sets this —
    /// not exposed via the admin Role CRUD surface, same as <see cref="IsSystem"/>.
    /// </summary>
    public bool RequiresOnboarding { get; set; }

    public ICollection<UserRoleAssignmentEntity> UserRoles { get; set; } =
        new List<UserRoleAssignmentEntity>();

    public ICollection<RolePermissionEntity> RolePermissions { get; set; } =
        new List<RolePermissionEntity>();
}
