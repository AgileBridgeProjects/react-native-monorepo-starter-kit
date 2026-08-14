namespace StarterKit.WebApi.Users.DTOs;

public sealed class BulkUploadConfirmResponse
{
    public int CreatedCount { get; init; }
    public int FailedCount { get; init; }
    public IReadOnlyList<BulkUploadInvalidRowResponse> Failures { get; init; } = [];
}
