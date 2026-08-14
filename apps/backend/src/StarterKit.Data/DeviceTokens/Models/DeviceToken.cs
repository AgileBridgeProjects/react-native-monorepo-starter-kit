using StarterKit.Data.Auditing;
using StarterKit.Data.DeviceTokens.Enums;
using StarterKit.Data.Persistence.Entities;

namespace StarterKit.Data.DeviceTokens.Models;

[ExcludeFromAuditLog]
public class DeviceToken
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public PushPlatform Platform { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation properties
    public UserEntity User { get; set; } = null!;
}
