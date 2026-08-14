using StarterKit.Core.Common;

namespace StarterKit.Core.Teams;

public sealed class TeamListQuery : PagedAndFilteredQuery
{
    public Guid? ClubId { get; init; }
    public Guid? SeasonId { get; init; }
}
