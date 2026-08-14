using System.Net.Mime;

namespace StarterKit.Core.Storage;

/// <summary>
/// Shared configuration for media upload validation used by services that accept
/// image and document files (e.g. topic category media).
/// Bound from the <c>"MediaUpload"</c> section of <c>appsettings.json</c>.
/// Defaults are applied when the section is absent (tests, minimal hosts).
/// </summary>
public sealed class MediaUploadOptions
{
    public const string SectionName = "MediaUpload";

    /// <summary>
    /// MIME types accepted for media uploads.
    /// Default: JPEG, PNG, GIF, WebP, PDF, MP4.
    /// <para>
    /// Deliberately excludes <c>video/quicktime</c>. It was added for iOS <c>.mov</c> picks,
    /// but the mobile composer now requests the picker's <c>Compatible</c> asset
    /// representation, which transcodes to H.264 MP4 before upload — so nothing needed it.
    /// Because these options are SHARED (notification/communication attachments validate
    /// against the same array), widening them here would also have accepted <c>.mov</c> on
    /// surfaces that cannot render video at all.
    /// </para>
    /// <para>
    /// Uses <see cref="MediaTypeNames"/> where the BCL has a constant. It has no
    /// <c>Video</c> type at all (absent from the .NET 10 ref pack's metadata, unlike
    /// <c>Image.*</c> and <c>Application.Pdf</c>, which are present), so <c>video/mp4</c>
    /// stays a literal.
    /// </para>
    /// </summary>
    public string[] AllowedContentTypes { get; set; } =
    [
        MediaTypeNames.Image.Jpeg,
        MediaTypeNames.Image.Png,
        MediaTypeNames.Image.Gif,
        MediaTypeNames.Image.Webp,
        MediaTypeNames.Application.Pdf,
        "video/mp4",
    ];

    /// <summary>
    /// Maximum upload size in bytes for non-video files (images, PDFs). Default: 10 MiB.
    /// </summary>
    public long MaxFileSizeBytes { get; set; } = 10 * 1024 * 1024;

    /// <summary>
    /// Maximum upload size in bytes for any <c>video/*</c> content type (the caller branches
    /// on the prefix, not on a specific type). Default: 500 MiB.
    /// </summary>
    public long MaxVideoFileSizeBytes { get; set; } = 500 * 1024 * 1024;
}
