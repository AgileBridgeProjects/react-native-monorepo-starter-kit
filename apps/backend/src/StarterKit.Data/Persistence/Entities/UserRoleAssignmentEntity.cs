using StarterKit.Data.Auditing;

namespace StarterKit.Data.Persistence.Entities;

[ExcludeFromAuditLog]
public class UserRoleAssignmentEntity
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid RoleId { get; set; }
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;

    public UserEntity User { get; set; } = null!;
    public RoleEntity Role { get; set; } = null!;
}
