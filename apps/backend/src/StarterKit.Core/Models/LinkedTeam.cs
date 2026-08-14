using StarterKit.Data.Teams.Enums;

namespace StarterKit.Core.Models;

/// <summary>
/// A team linked to a coach via <c>UserTeam</c>, as shown read-only on the coach onboarding
/// flow's linked-teams step. <see cref="LogoUrl"/> is a short-lived SAS URL resolved
/// from <c>Team.LogoUrl</c>, or null when the team has no logo.
/// </summary>
public sealed record LinkedTeam
{
    public required Guid TeamId { get; init; }
    public required string Name { get; init; }
    public AgeGroup? AgeGroup { get; init; }
    public string? LogoUrl { get; init; }
}
