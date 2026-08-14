namespace StarterKit.Core.Notifications.DTOs;

/// <summary>
/// A file attachment to include in an outbound email.
/// </summary>
public sealed record EmailAttachment(
    /// <summary>The MIME type of the attachment, e.g. <c>image/png</c>.</summary>
    string ContentType,
    /// <summary>The file name shown to the recipient.</summary>
    string FileName,
    /// <summary>The Base64-encoded file content.</summary>
    string ContentBase64
);
