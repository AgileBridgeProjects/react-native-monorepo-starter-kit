namespace StarterKit.Data.Reports;

public abstract class PagedAndFilteredQuery
{
    public string? FilterText { get; init; }
    public string? SortBy { get; init; }
    public bool SortDescending { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 50;
}
