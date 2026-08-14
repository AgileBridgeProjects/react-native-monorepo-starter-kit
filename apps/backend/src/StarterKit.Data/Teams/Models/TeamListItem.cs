namespace StarterKit.Data.Teams.Models;

/// <summary>Team with its active-user count, returned by the list query.</summary>
public sealed record TeamListItem(Team Team, int UserCount);
