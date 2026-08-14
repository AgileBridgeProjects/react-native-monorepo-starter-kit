namespace StarterKit.Core.Reports.DTOs;

/// <summary>A player leave period shown in the Players → Leave admin list (ABC-123 #1).</summary>
public sealed record LeaveRecordDto
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
