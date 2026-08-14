namespace StarterKit.Core.Clubs.DTOs;

/// <summary>
/// Input for creating a new club. Passed from the controller DTO to the service layer.
/// </summary>
public sealed record CreateClubCommand(
    string Name,
    string StreetAddress,
    string City,
    string State,
    DateOnly SeasonStartDate,
    DateOnly SeasonEndDate,
    string? SeasonName = null,
    string? ZipCode = null,
    string? Timezone = null,
    int? MaxAthletes = null,
    string? LogoUrl = null
);
