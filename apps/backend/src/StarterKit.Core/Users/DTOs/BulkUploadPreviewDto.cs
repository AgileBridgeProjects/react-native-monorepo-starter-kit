namespace StarterKit.Core.Users.DTOs;

public sealed record BulkUploadPreviewDto(
    IReadOnlyList<BulkUploadValidUserDto> ReadyToAdd,
    IReadOnlyList<BulkUploadInvalidRowDto> ValidationErrors,
    IReadOnlyList<BulkUploadInvalidRowDto> Duplicates,
    IReadOnlyList<BulkUploadInvalidRowDto> Unprocessable,
    int TotalRows
);
