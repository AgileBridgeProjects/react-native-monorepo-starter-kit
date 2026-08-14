namespace StarterKit.Core.Users.Exceptions;

/// <summary>
/// Thrown when a bulk-upload file is structurally invalid (e.g. missing required template columns).
/// Mapped to HTTP 400 by <c>BulkUploadExceptionHandler</c> in the WebApi project.
/// </summary>
public sealed class BulkUploadValidationException : Exception
{
    public IReadOnlyList<string> ValidationErrors { get; }

    public BulkUploadValidationException(IReadOnlyList<string> errors)
        : base("Bulk upload file failed validation.")
    {
        ValidationErrors = errors;
    }

    public BulkUploadValidationException(string error)
        : this([error]) { }
}
