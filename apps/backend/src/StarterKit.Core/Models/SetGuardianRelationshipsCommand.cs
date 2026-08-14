using StarterKit.Data.Users.Enums;

namespace StarterKit.Core.Models;

/// <summary>
/// The relationships a parent declares against their linked athletes during onboarding
///. One entry per linked athlete — a parent with several children sets each
/// independently.
/// </summary>
public sealed record SetGuardianRelationshipsCommand
{
    public required Guid GuardianUserId { get; init; }
    public required IReadOnlyList<GuardianRelationshipAssignment> Relationships { get; init; }
}

/// <summary>A single athlete-to-relationship assignment.</summary>
public sealed record GuardianRelationshipAssignment(
    Guid AthleteUserId,
    GuardianRelationship Relationship
);
