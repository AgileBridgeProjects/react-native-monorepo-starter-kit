using StarterKit.Data.Users.Enums;

namespace StarterKit.MobileApi.Users.DTOs;

/// <summary>
/// An athlete linked to the authenticated parent. Read-only — the link itself is created
/// by an admin in the portal; the parent only declares <c>Relationship</c>.
/// <c>PhotoUrl</c> is a short-lived SAS URL, or null when the athlete has no face photo or avatar.
/// </summary>
public sealed record LinkedAthleteResponse(
    Guid AthleteUserId,
    string DisplayName,
    string? TeamName,
    PlayingPosition? Position,
    int? JerseyNumber,
    string? PhotoUrl,
    GuardianRelationship? Relationship
);
