using System.ComponentModel.DataAnnotations;

namespace StarterKit.Core.Storage;

/// <summary>
/// Upload validation rules specific to club logos.
/// Bound from the <c>"LogoUpload"</c> section of <c>appsettings.json</c>.
/// Per docs/standards/backend.md — Options pattern: values live in appsettings,
/// not as C# property defaults. The array binder appends to defaults rather
/// than replacing them, so any C# default here would cause duplicate entries.
/// </summary>
public sealed class LogoUploadOptions
{
    public const string SectionName = "LogoUpload";

    /// <summary>MIME types accepted for logo uploads.</summary>
    [Required]
    [MinLength(1)]
    public required string[] AllowedContentTypes { get; init; }

    /// <summary>Maximum upload size in bytes.</summary>
    [Range(1, long.MaxValue)]
    public required long MaxFileSizeBytes { get; init; }
}
