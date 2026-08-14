using StarterKit.Core.Common;

namespace StarterKit.WebApi.Teams.DTOs;

public sealed class TeamListQuery : PagedAndFilteredQuery
{
    public Guid? ClubId { get; init; }
    public Guid? SeasonId { get; init; }
}
