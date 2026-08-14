namespace StarterKit.Data.Users;

using StarterKit.Data.Clubs.Enums;

/// <summary>
/// Encapsulates filter and paging parameters for a user list query.
/// Passed to <see cref="Interfaces.Repositories.IUserRepository.ListAsync"/>.
/// </summary>
public sealed class UserFilter
{
    public Guid? ClubId { get; init; }
    public Guid? TeamId { get; init; }

    /// <summary>
    /// Restricts to users who are members of any of these teams. Distinct from <see cref="TeamId"/>
    /// (a single-team filter) — used by callers that need to match across a user's full set of
    /// <c>UserTeams</c> links, e.g. resolving coach recipients across all of a multi-team athlete's teams.
    /// </summary>
    public IReadOnlyList<Guid>? TeamIds { get; init; }
    public string? FilterText { get; init; }
    public string? SortBy { get; init; }
    public bool SortDescending { get; init; }
    public bool? IsActive { get; init; }
    public AuthenticationMethod? AuthMethod { get; init; }
    public string? RoleName { get; init; }

    /// <summary>When true, restrict to users who have an active (non-expired, non-invalidated) setup token.</summary>
    public bool? HasPendingSetup { get; init; }

    /// <summary>When true, restrict to users whose setup tokens have all expired or been invalidated (and who haven't logged in).</summary>
    public bool? HasExpiredSetup { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
}
