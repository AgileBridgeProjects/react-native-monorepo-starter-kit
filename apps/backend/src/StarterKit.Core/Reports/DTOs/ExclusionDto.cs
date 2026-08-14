namespace StarterKit.Core.Reports.DTOs;

public sealed record ExclusionDto
{
    public Guid UserId { get; init; }
    public string? DisplayName { get; init; }
    public string? Reason { get; init; }
    public DateTime CreatedAt { get; init; }
}
