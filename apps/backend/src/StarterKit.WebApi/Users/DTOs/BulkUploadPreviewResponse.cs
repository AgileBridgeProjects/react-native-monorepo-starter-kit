namespace StarterKit.WebApi.Users.DTOs;

public sealed class BulkUploadPreviewResponse
{
    /// <summary>Users that passed all validation and are ready to be created.</summary>
    public IReadOnlyList<BulkUploadValidRowRequest> ReadyToAdd { get; init; } = [];

    /// <summary>Rows with format or business-logic validation errors.</summary>
    public IReadOnlyList<BulkUploadInvalidRowResponse> ValidationErrors { get; init; } = [];

    /// <summary>Rows whose email or phone matches an existing user in the club.</summary>
    public IReadOnlyList<BulkUploadInvalidRowResponse> Duplicates { get; init; } = [];

    /// <summary>Rows that are completely empty or too malformed to classify.</summary>
    public IReadOnlyList<BulkUploadInvalidRowResponse> Unprocessable { get; init; } = [];

    public int TotalRows { get; init; }
}

public sealed class BulkUploadInvalidRowResponse
{
    public int RowNumber { get; init; }
    public string? FirstName { get; init; }
    public string? LastName { get; init; }
    public string? Email { get; init; }
    public string? PhoneNumber { get; init; }
    public IReadOnlyList<string> Errors { get; init; } = [];
}
