using StarterKit.Data.Auditing;
using StarterKit.Data.Persistence.Entities;
using StarterKit.Data.PushNotifications.Enums;

namespace StarterKit.Data.PushNotifications.Models;

[ExcludeFromAuditLog]
public class PushNotification
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public PushNotificationType NotificationType { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool IsRead { get; set; }

    /// <summary>Set when the FE renders the item; prevents the sweep job from pushing.</summary>
    public DateTime? SeenAt { get; set; }

    /// <summary>Set by the sweep job after push is dispatched; prevents re-sending.</summary>
    public DateTime? PushSentAt { get; set; }

    public DateTime CreatedAt { get; set; }

    /// <summary>Optional URL for media sent with this notification (image, document, or link).</summary>
    public string? MediaUrl { get; set; }

    // Navigation properties
    public UserEntity User { get; set; } = null!;
}
