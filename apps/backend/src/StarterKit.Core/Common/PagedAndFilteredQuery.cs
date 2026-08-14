using System.ComponentModel.DataAnnotations;

namespace StarterKit.Core.Common;

/// <summary>
/// Base class for query objects that support paging and a free-text filter.
/// Extend this class to add domain-specific filter properties.
/// </summary>
public abstract class PagedAndFilteredQuery
{
    [StringLength(200)]
    public string? FilterText { get; init; }
    public string? SortBy { get; init; }
    public bool SortDescending { get; init; } = false;
    public int Page { get; init; } = PagingConstants.DefaultPage;
    public int PageSize { get; init; } = PagingConstants.DefaultPageSize;

    /// <summary>
    /// Page number clamped to ≥ 1. Always use this instead of <see cref="Page"/> when
    /// building a repository filter so that query-string values of 0 or negative never
    /// produce a negative Skip.
    /// </summary>
    public int ClampedPage => Math.Max(1, Page);

    /// <summary>
    /// Page size clamped to [1, <see cref="PagingConstants.MaxPageSize"/>]. Always use
    /// this instead of <see cref="PageSize"/> when building a repository filter.
    /// </summary>
    public int ClampedPageSize => Math.Max(1, Math.Min(PageSize, PagingConstants.MaxPageSize));
}
