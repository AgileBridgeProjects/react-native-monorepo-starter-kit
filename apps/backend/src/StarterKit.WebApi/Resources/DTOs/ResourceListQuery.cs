using StarterKit.Core.Common;

namespace StarterKit.WebApi.Resources.DTOs;

/// <summary>
/// Query object for listing resources with paging and optional free-text filter.
/// </summary>
public sealed class ResourceListQuery : PagedAndFilteredQuery { }
