using StarterKit.Core.Validation;

namespace StarterKit.WebApi.Users.DTOs;

public sealed class BulkUploadConfirmRequest
{
    [NonEmptyGuid]
    public Guid ClubId { get; init; }

    public Guid? TeamId { get; init; }

    /// <summary>
    /// The valid rows echoed from the preview response. Only these rows will be created.
    /// </summary>
    public IReadOnlyList<BulkUploadValidRowRequest> ValidRows { get; init; } = [];
}
