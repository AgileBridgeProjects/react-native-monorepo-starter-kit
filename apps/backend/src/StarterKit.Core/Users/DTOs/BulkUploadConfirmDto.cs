namespace StarterKit.Core.Users.DTOs;

public sealed record BulkUploadConfirmDto(
    int CreatedCount,
    int FailedCount,
    IReadOnlyList<BulkUploadInvalidRowDto> Failures
);
