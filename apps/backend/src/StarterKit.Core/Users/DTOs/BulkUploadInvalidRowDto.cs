namespace StarterKit.Core.Users.DTOs;

public sealed record BulkUploadInvalidRowDto(
    int RowNumber,
    string? FirstName,
    string? LastName,
    string? Email,
    string? PhoneNumber,
    IReadOnlyList<string> Errors
);
