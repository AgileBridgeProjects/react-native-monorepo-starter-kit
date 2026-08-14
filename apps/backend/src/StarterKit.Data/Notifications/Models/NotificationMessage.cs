using StarterKit.Data.Auditing;
using StarterKit.Data.Notifications.Enums;

namespace StarterKit.Data.Notifications.Models;

public class NotificationMessage : IAuditable, ISoftDeletable, IConcurrent
{
    public Guid Id { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public NotificationStatus Status { get; set; }
    public MessageChannel Channel { get; set; }
    public Guid ClubId { get; set; }
    public Guid? TeamId { get; set; }
    public List<StoredAttachment> Attachments { get; set; } = [];
    public string? MediaUrl { get; set; }
    public int? TotalRecipients { get; set; }
    public int? Delivered { get; set; }
    public int? Failed { get; set; }
    public DateTime? SentAt { get; set; }
    public string? SentBy { get; set; }
    public string? BackgroundJobId { get; set; }

    // IAuditable
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    // ISoftDeletable
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public string? DeletedBy { get; set; }
}
