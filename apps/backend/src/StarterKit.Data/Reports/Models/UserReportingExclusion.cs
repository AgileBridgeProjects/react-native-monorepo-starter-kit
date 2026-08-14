using StarterKit.Data.Auditing;

namespace StarterKit.Data.Reports.Models;

public class UserReportingExclusion : IAuditable, ISoftDeletable, IConcurrent
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid ClubId { get; set; }
    public string? Reason { get; set; }

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
