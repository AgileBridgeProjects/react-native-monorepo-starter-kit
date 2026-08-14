namespace StarterKit.Core.Auth.DTOs;

/// <summary>
/// Lightweight projection representing an organisation a user is linked to.
/// Used by the multi-org selection flow.
/// </summary>
public sealed record LinkedOrganisation(Guid ClubId, string ClubName, string? LogoUrl);
