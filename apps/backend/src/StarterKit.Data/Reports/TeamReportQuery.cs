namespace StarterKit.Data.Reports;

public sealed class TeamReportQuery : PagedAndFilteredQuery
{
    public Guid ClubId { get; init; }
    public DateOnly From { get; init; }
    public DateOnly To { get; init; }
}
