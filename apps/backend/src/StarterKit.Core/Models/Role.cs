namespace StarterKit.Core.Models;

public class Role
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public bool IsElevated { get; set; }
    public bool IsPortalRole { get; set; }
    public bool IsSystem { get; set; }
    public bool IsDefault { get; set; }
    public bool RequiresOnboarding { get; set; }
    public Guid? ClubId { get; set; }
    public List<string> Permissions { get; set; } = [];

    public ICollection<UserRoleAssignment> UserRoles { get; set; } = new List<UserRoleAssignment>();
}
