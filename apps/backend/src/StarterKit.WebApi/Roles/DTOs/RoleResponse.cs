namespace StarterKit.WebApi.Roles.DTOs;

public sealed class RoleResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public bool IsElevated { get; set; }
    public bool IsPortalRole { get; set; }

    /// <summary>
    /// True for built-in system roles (SuperAdmin, ClubAdmin) that cannot be deleted
    /// or renamed by an admin.
    /// </summary>
    public bool IsSystem { get; set; }

    /// <summary>The club this role belongs to. Null for system-wide roles.</summary>
    public Guid? ClubId { get; set; }

    /// <summary>True if this is the default role assigned to new users.</summary>
    public bool IsDefault { get; set; }

    public List<string> Permissions { get; set; } = [];
}
