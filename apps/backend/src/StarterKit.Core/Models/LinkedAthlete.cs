using StarterKit.Data.Users.Enums;

namespace StarterKit.Core.Models;

/// <summary>
/// An athlete linked to a parent via <c>UserGuardian</c>, as shown read-only on the parent
/// onboarding flow's linked-athletes step. <see cref="Relationship"/> is null until the
/// parent declares it.
/// </summary>
public sealed record LinkedAthlete
{
    public required Guid AthleteUserId { get; init; }
    public required string DisplayName { get; init; }

    /// <summary>Name of the athlete's team, or null when they are not assigned to one.</summary>
    public string? TeamName { get; init; }

    public PlayingPosition? Position { get; init; }
    public int? JerseyNumber { get; init; }

    /// <summary>
    /// Short-lived SAS URL for the athlete's face onboarding photo, falling back to their avatar.
    /// Null when the athlete has uploaded neither — the client renders initials instead.
    /// </summary>
    public string? PhotoUrl { get; init; }

    public GuardianRelationship? Relationship { get; init; }
}
