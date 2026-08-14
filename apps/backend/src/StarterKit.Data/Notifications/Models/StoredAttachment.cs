namespace StarterKit.Data.Notifications.Models;

/// <summary>
/// Represents a file attachment stored in Azure Blob Storage alongside a notification message.
/// Serialised as JSON in the Attachments column — only metadata, not file content.
/// </summary>
public sealed record StoredAttachment(string FileName, string ContentType, string BlobPath);
