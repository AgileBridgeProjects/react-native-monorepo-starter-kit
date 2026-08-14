using System.ComponentModel.DataAnnotations;
using StarterKit.Core.Validation;
using StarterKit.Data.Users.Enums;

namespace StarterKit.MobileApi.Users.DTOs;

/// <summary>
/// The relationships the authenticated parent declares against their linked athletes, submitted on
/// the final parent onboarding step. One entry per linked athlete.
/// </summary>
public sealed record SetLinkedAthleteRelationshipsRequest
{
    [Required]
    [MinLength(1)]
    public required IReadOnlyList<LinkedAthleteRelationshipRequest> Relationships { get; init; }
}

/// <summary>A single athlete-to-relationship assignment.</summary>
public sealed record LinkedAthleteRelationshipRequest
{
    [NonEmptyGuid]
    public required Guid AthleteUserId { get; init; }

    public required GuardianRelationship Relationship { get; init; }
}
