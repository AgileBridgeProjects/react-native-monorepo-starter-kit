namespace StarterKit.Core.Clubs.DTOs;

/// <summary>
/// Input for updating an existing club. Passed from the controller DTO to the service layer.
/// </summary>
public sealed record UpdateClubCommand(
    Guid Id,
    string Name,
    string StreetAddress,
    string City,
    string State,
    string? ZipCode = null,
    string? Timezone = null,
    int? MaxAthletes = null,
    string? LogoUrl = null
);
