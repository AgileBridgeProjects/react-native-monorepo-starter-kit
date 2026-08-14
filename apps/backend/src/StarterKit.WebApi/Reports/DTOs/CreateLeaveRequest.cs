namespace StarterKit.WebApi.Reports.DTOs;

public sealed class CreateLeaveRequest
{
    public Guid UserId { get; init; }
    public DateOnly StartDate { get; init; }
    public DateOnly EndDate { get; init; }
    public string? Reason { get; init; }
}
