using StarterKit.Core.Common;

namespace StarterKit.WebApi.Common;

/// <summary>
/// Base paged response DTO for all paginated list endpoints.
/// Mirrors <see cref="IPagedResult{T}"/> for the HTTP contract layer.
/// </summary>
public class PagedResponse<T>
{
    public IReadOnlyList<T> Items { get; init; } = [];
    public int TotalCount { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
    public bool HasNextPage { get; init; }

    public static PagedResponse<T> From(IPagedResult<T> result) =>
        new()
        {
            Items = result.Items,
            TotalCount = result.TotalCount,
            Page = result.Page,
            PageSize = result.PageSize,
            HasNextPage = result.HasNextPage,
        };
}
