using System.Text.RegularExpressions;
using StarterKit.Core.Notifications.DTOs;

namespace StarterKit.Core.Notifications.Helpers;

/// <summary>
/// Extracts base64 data-URI images from HTML and converts them into
/// CID-referenced inline attachments suitable for email clients.
/// </summary>
public static partial class InlineImageExtractor
{
    [GeneratedRegex(
        """src\s*=\s*["']data:(?<mime>image/[^;]+);base64,(?<data>[^"']+)["']""",
        RegexOptions.IgnoreCase | RegexOptions.Compiled
    )]
    private static partial Regex DataUriRegex();

    /// <summary>
    /// Scans <paramref name="html"/> for inline base64 images, replaces each with a
    /// <c>cid:</c> reference, and returns the modified HTML plus a list of inline attachments.
    /// </summary>
    public static (string ProcessedHtml, List<InlineAttachment> InlineAttachments) Extract(
        string html
    )
    {
        var attachments = new List<InlineAttachment>();
        var counter = 0;

        var processedHtml = DataUriRegex()
            .Replace(
                html,
                match =>
                {
                    var mime = match.Groups["mime"].Value;
                    var base64 = match.Groups["data"].Value;
                    var ext = mime.Split('/')[1].Split('+')[0]; // e.g. "png", "jpeg"
                    var contentId = $"inline-img-{counter++}";
                    var fileName = $"{contentId}.{ext}";

                    attachments.Add(
                        new InlineAttachment(
                            ContentType: mime,
                            FileName: fileName,
                            ContentBase64: base64,
                            ContentId: contentId
                        )
                    );

                    return $"""src="cid:{contentId}" """;
                }
            );

        return (processedHtml, attachments);
    }
}
