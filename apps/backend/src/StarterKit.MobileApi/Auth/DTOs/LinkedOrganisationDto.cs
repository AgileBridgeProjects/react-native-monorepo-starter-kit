namespace StarterKit.MobileApi.Auth.DTOs;

/// <summary>
/// Represents one organisation the authenticated user is linked to.
/// Returned by GET /api/auth/me/organisations.
/// </summary>
public sealed record LinkedOrganisationDto(Guid ClubId, string ClubName, string? ClubLogoUrl);
