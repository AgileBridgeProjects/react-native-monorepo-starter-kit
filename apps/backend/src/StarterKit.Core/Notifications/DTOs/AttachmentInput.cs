namespace StarterKit.Core.Notifications.DTOs;

/// <summary>
/// Incoming attachment data (base64-encoded) for upload to blob storage.
/// </summary>
public sealed record AttachmentInput(string FileName, string ContentType, string ContentBase64);
