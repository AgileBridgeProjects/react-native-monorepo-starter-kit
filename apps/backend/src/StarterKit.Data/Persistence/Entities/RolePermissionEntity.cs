using StarterKit.Data.Auditing;

namespace StarterKit.Data.Persistence.Entities;

[ExcludeFromAuditLog]
public class RolePermissionEntity
{
    public Guid Id { get; set; }
    public Guid RoleId { get; set; }
    public string Permission { get; set; } = string.Empty;

    public RoleEntity Role { get; set; } = null!;
}
