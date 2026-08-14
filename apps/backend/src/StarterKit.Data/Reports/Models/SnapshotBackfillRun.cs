using StarterKit.Data.Auditing;

namespace StarterKit.Data.Reports.Models;

/// <summary>
/// Tracks each execution of <c>StartupSnapshotBackfillJob</c>'s recompute pass so "did the
/// recompute window already run today" is derived from an explicit run record instead of
/// inferring it from side-effects on snapshot rows — a crash mid-run leaves <see cref="CompletedAt"/>
/// null, so the next startup correctly re-attempts rather than wrongly skipping (ABC-123).
/// </summary>
[ExcludeFromAuditLog]
public class SnapshotBackfillRun : IAuditable, ISoftDeletable, IConcurrent
{
    public Guid Id { get; set; }
    public DateOnly Date { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

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
