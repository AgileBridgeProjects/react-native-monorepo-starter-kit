namespace StarterKit.Core.Common;

public interface IPagedResult<out T>
{
    IReadOnlyList<T> Items { get; }
    int TotalCount { get; }
    int Page { get; }
    int PageSize { get; }
    bool HasNextPage { get; }
}
