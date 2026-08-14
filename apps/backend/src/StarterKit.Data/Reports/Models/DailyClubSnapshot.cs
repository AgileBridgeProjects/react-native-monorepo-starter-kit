using StarterKit.Data.Auditing;

namespace StarterKit.Data.Reports.Models;

[ExcludeFromAuditLog]
public class DailyClubSnapshot : IAuditable, ISoftDeletable, IConcurrent
{
    public Guid Id { get; set; }
    public Guid ClubId { get; set; }
    public DateOnly Date { get; set; }
    public int TotalAssignedPlayers { get; set; }

    /// <summary>Users with LastLoginAt != null (ever-active headcount). Used as participation rate numerator.</summary>
    public int TotalActivePlayers { get; set; }
    public int TotalSessions { get; set; }
    public int TotalCorrectAnswers { get; set; }
    public int TotalAnswers { get; set; }
    public decimal AverageAccuracy { get; set; }
    public int TotalCompletions { get; set; }

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
