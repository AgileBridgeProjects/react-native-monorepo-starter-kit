using System.Net.Mime;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats;

namespace StarterKit.Core.Storage;

/// <summary>
/// Magic-byte signature check for image uploads — catches a spoofed Content-Type header
/// carrying non-image bytes, independent of <see cref="FileUploadValidator"/>'s
/// declared-Content-Type check. Detection is delegated to ImageSharp's format sniffer
/// (header-only, does not decode pixel data) rather than a hand-rolled byte table.
/// </summary>
public static class ImageSignatureValidator
{
    public static readonly string[] AllowedContentTypes =
    [
        MediaTypeNames.Image.Jpeg,
        MediaTypeNames.Image.Png,
        MediaTypeNames.Image.Gif,
        MediaTypeNames.Image.Webp,
    ];

    /// <summary>
    /// Detects the file's actual image format from its leading bytes and checks it matches the
    /// declared content type. Leaves the stream positioned at 0 for the subsequent upload
    /// either way.
    /// </summary>
    public static async Task<bool> HasValidSignatureAsync(
        Stream stream,
        string contentType,
        CancellationToken cancellationToken
    )
    {
        try
        {
            IImageFormat detectedFormat = await Image.DetectFormatAsync(stream, cancellationToken);
            return string.Equals(
                detectedFormat.DefaultMimeType,
                contentType,
                StringComparison.OrdinalIgnoreCase
            );
        }
        catch (UnknownImageFormatException)
        {
            return false;
        }
        finally
        {
            stream.Position = 0;
        }
    }
}
