namespace StarterKit.WebApi.Clubs.DTOs;

/// <summary>
/// Server-canonical constraints for logo uploads. Exposed so the frontend can
/// build accept-lists, hint text, and pre-flight size checks without
/// hardcoding values that could drift from the backend's
/// <c>LogoUploadOptions</c>.
/// </summary>
public sealed class UploadConstraintsResponse
{
    /// <summary>MIME types accepted by the upload endpoint (e.g. <c>image/png</c>).</summary>
    public required IReadOnlyList<string> AllowedContentTypes { get; init; }

    /// <summary>Maximum upload size in bytes. The frontend converts to MB for display.</summary>
    public required long MaxFileSizeBytes { get; init; }
}
