using StarterKit.Data.Auditing;
using StarterKit.Data.Clubs.Models;

namespace StarterKit.Data.Seasons.Models;

public class Season : IAuditable, ISoftDeletable, IConcurrent
{
    public Guid Id { get; set; }
    public Guid ClubId { get; set; }
    public Club Club { get; set; } = null!;

    /// <summary>Optional display name (e.g. "2026 Indoor"). Null falls back to a date-derived label.</summary>
    public string? Name { get; set; }

    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }

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
