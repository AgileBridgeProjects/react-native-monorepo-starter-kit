namespace StarterKit.Data.Reports.Models;

/// <summary>Projection returned by <c>UserReportingExclusionRepository.GetAllWithDisplayNamesAsync</c>.</summary>
public sealed class ExclusionRow
{
    public Guid UserId { get; init; }
    public string? DisplayName { get; init; }
    public string? Reason { get; init; }
    public DateTime CreatedAt { get; init; }
}
