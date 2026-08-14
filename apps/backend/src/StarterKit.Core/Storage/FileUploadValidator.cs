using StarterKit.Core.Resources;

namespace StarterKit.Core.Storage;

/// <summary>
/// Centralised upload validation used by every service that accepts a file upload.
/// Throws <see cref="ArgumentException"/> with a caller-friendly message on failure so
/// controllers can surface validation errors without duplicating the guard logic.
/// </summary>
public static class FileUploadValidator
{
    /// <summary>
    /// Validates <paramref name="file"/> against the supplied constraints.
    /// </summary>
    /// <param name="file">The uploaded file to validate.</param>
    /// <param name="allowedContentTypes">
    ///   MIME types that are accepted (case-insensitive). Pass an empty array to skip the
    ///   content-type check.
    /// </param>
    /// <param name="maxFileSizeBytes">Maximum accepted byte length.</param>
    /// <param name="paramName">
    ///   The parameter name used in the thrown <see cref="ArgumentException"/>; defaults to
    ///   <c>"file"</c>.
    /// </param>
    /// <exception cref="ArgumentException">Thrown when any validation rule is violated.</exception>
    public static void Validate(
        UploadedFile file,
        string[] allowedContentTypes,
        long maxFileSizeBytes,
        string paramName = "file"
    )
    {
        if (file.ContentLength == 0)
            throw new ArgumentException("File must not be empty.", paramName);

        if (file.ContentLength > maxFileSizeBytes)
            throw new ArgumentException(
                $"File must be smaller than {maxFileSizeBytes / (1024 * 1024)} MB.",
                paramName
            );

        if (
            allowedContentTypes.Length > 0
            && !allowedContentTypes.Contains(file.ContentType, StringComparer.OrdinalIgnoreCase)
        )
            throw new ArgumentException(
                $"File type is not allowed. Accepted types: {string.Join(", ", allowedContentTypes)}.",
                paramName
            );
    }
}
