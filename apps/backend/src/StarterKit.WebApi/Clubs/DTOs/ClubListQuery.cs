using StarterKit.Core.Common;

namespace StarterKit.WebApi.Clubs.DTOs;

/// <summary>
/// Query object for listing clubs with paging and optional free-text filter.
/// Extend with additional club-specific filter properties as needed.
/// </summary>
public sealed class ClubListQuery : PagedAndFilteredQuery { }
