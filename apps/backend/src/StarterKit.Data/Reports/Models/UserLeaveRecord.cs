using StarterKit.Data.Auditing;

namespace StarterKit.Data.Reports.Models;

/// <summary>
/// A date-range leave period for a player. While a date falls within [StartDate, EndDate] the
/// player is excluded from that day's reporting aggregates, exactly like a
/// <see cref="UserReportingExclusion" /> but scoped to the covered dates only (ABC-123 #1).
/// </summary>
public class UserLeaveRecord : IAuditable, ISoftDeletable, IConcurrent
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid ClubId { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
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

/// <summary>Leave record projected with the player's display name for the admin list view.</summary>
public sealed class LeaveRecordRow
{
    public Guid Id { get; init; }
    public Guid UserId { get; init; }
    public string DisplayName { get; init; } = string.Empty;
    public string? TeamName { get; init; }
    public DateOnly StartDate { get; init; }
    public DateOnly EndDate { get; init; }
    public string? Reason { get; init; }
    public DateTime CreatedAt { get; init; }
}
