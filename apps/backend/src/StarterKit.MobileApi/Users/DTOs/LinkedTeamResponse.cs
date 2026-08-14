using StarterKit.Data.Teams.Enums;

namespace StarterKit.MobileApi.Users.DTOs;

/// <summary>
/// A team linked to the authenticated coach. Read-only — the link itself is created by
/// an admin in the portal. <c>LogoUrl</c> is a short-lived SAS URL, or null when the team has no
/// logo yet.
/// </summary>
public sealed record LinkedTeamResponse(
    Guid TeamId,
    string Name,
    AgeGroup? AgeGroup,
    string? LogoUrl
);
