using StarterKit.Data.Auditing;

namespace StarterKit.Data.Reports.Models;

[ExcludeFromAuditLog]
public class DailyTeamSnapshot : IAuditable, ISoftDeletable, IConcurrent
{
    public Guid Id { get; set; }
    public Guid TeamId { get; set; }
    public Guid ClubId { get; set; }
    public DateOnly Date { get; set; }
    public int TotalActivePlayers { get; set; }
    public int TotalSessions { get; set; }
    public int CorrectAnswers { get; set; }
    public int TotalAnswers { get; set; }
    public decimal AverageAccuracy { get; set; }
    public decimal CompletionRate { get; set; }

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
