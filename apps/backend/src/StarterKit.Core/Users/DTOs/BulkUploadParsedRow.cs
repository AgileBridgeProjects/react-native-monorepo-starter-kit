using StarterKit.Core.Excel;
using StarterKit.Data.Clubs.Enums;
using StarterKit.Data.Users.Enums;

namespace StarterKit.Core.Users.DTOs;

public sealed record BulkUploadParsedRow(
    int RowNumber,
    string FirstName,
    string LastName,
    string? Email,
    string? PhoneNumber,
    string? CountryCode,
    AuthenticationMethod? AuthMethod,
    string? RoleName,
    string? TeamName,
    string? Username,
    IReadOnlyList<string> Errors,
    DateOnly? DateOfBirth = null,
    PlayingPosition? Position = null,
    int? JerseyNumber = null,
    string? ParentGuardianEmail = null
) : IHasErrors;
