using StarterKit.Data.Persistence.Entities;

namespace StarterKit.Data.Users.Models;

/// <summary>
/// One athlete's membership on one of a set of requested teams — used when a caller (e.g. a
/// Coach with several teams) needs the roster across all of them at once, tagged with which
/// team each athlete belongs to for display. An athlete
/// linked to more than one of the requested teams appears once per team.
/// </summary>
public sealed record AthleteTeamMembership
{
    public required UserEntity Athlete { get; init; }
    public required Guid TeamId { get; init; }
    public required string TeamName { get; init; }
}
