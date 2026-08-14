using StarterKit.Data.Resources.Enums;

namespace StarterKit.Core.Storage;

/// <summary>
/// Shared helpers for inferring <see cref="ResourceMediaType"/> from file names / paths
/// and detecting blob-style storage paths.
/// </summary>
public static class MediaTypeHelper
{
    /// <summary>
    /// Returns <c>true</c> when <paramref name="content"/> looks like a stored blob path
    /// rather than inline text (e.g. starts with <c>resources/</c> or ends with a known
    /// media extension).
    /// </summary>
    public static bool IsBlobPath(string? content)
    {
        if (string.IsNullOrWhiteSpace(content))
            return false;

        return content.StartsWith("resources/", StringComparison.OrdinalIgnoreCase)
            || content.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase)
            || content.EndsWith(".mp4", StringComparison.OrdinalIgnoreCase)
            || content.EndsWith(".png", StringComparison.OrdinalIgnoreCase)
            || content.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase)
            || content.EndsWith(".jpeg", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Best-effort inference of <see cref="ResourceMediaType"/> from a file name or path.
    /// Falls back to <see cref="ResourceMediaType.Document"/>.
    /// </summary>
    public static ResourceMediaType InferMediaType(string fileName)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        return ext switch
        {
            ".pdf" => ResourceMediaType.Pdf,
            ".mp4" or ".mov" or ".avi" or ".webm" => ResourceMediaType.Video,
            ".png" or ".jpg" or ".jpeg" or ".gif" or ".webp" or ".svg" => ResourceMediaType.Image,
            _ => ResourceMediaType.Document,
        };
    }

    /// <summary>
    /// Nullable variant — returns <c>null</c> only when the extension is completely unrecognised
    /// is not needed. Prefer <see cref="InferMediaType(string)"/> which always returns a value.
    /// </summary>
    public static ResourceMediaType? InferMediaTypeOrNull(string? path)
    {
        if (string.IsNullOrWhiteSpace(path))
            return null;

        return InferMediaType(path);
    }
}
