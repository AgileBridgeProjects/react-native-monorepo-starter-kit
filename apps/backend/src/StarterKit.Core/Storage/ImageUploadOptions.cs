namespace StarterKit.Core.Storage;

/// <summary>
/// Shared configuration for image upload validation used across all services that
/// accept image files (e.g. topic cover images, resource thumbnails).
/// Bound from the <c>"ImageUpload"</c> section of <c>appsettings.json</c>.
/// Defaults are applied when the section is absent (tests, minimal hosts).
/// </summary>
public sealed class ImageUploadOptions
{
    public const string SectionName = "ImageUpload";

    /// <summary>
    /// MIME types accepted for image uploads.
    /// Default: JPEG, PNG, GIF, WebP.
    /// </summary>
    public string[] AllowedContentTypes { get; set; } =
    ["image/jpeg", "image/png", "image/gif", "image/webp"];

    /// <summary>
    /// Maximum upload size in bytes. Default: 5 MiB.
    /// </summary>
    public long MaxFileSizeBytes { get; set; } = 5 * 1024 * 1024;
}
