namespace StarterKit.Core.Notifications.DTOs;

/// <summary>An inline (CID-referenced) attachment extracted from HTML by <see cref="Helpers.InlineImageExtractor"/>.</summary>
public sealed record InlineAttachment(
    string ContentType,
    string FileName,
    string ContentBase64,
    string ContentId
);
