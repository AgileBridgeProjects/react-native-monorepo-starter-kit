namespace StarterKit.Core.Storage;

/// <summary>
/// Registry of all Azure Blob Storage container names used in this application.
///
/// Use these constants wherever a container name is required — never pass raw strings.
/// When a new container is provisioned in Azure, add a corresponding constant here.
/// </summary>
public static class BlobContainerName
{
    /// <summary>
    /// Uploaded resources: PDFs, images, and other content files.
    /// Azure container: <c>resources</c> in <c>ststarterkit{env}</c>.
    /// </summary>
    public const string Resources = "resources";

    /// <summary>
    /// Uploaded club logo images (JPEG, PNG, GIF, WebP).
    /// Azure container: <c>club-images</c> in <c>ststarterkit{env}</c>.
    /// </summary>
    public const string ClubLogos = "club-images";

    /// <summary>
    /// User profile avatar images.
    /// Azure container: <c>user-avatars</c> in <c>ststarterkit{env}</c>.
    /// </summary>
    public const string UserAvatars = "user-avatars";

    /// <summary>
    /// Email communication attachments (PDFs, documents, etc.).
    /// Azure container: <c>communication-attachments</c> in <c>ststarterkit{env}</c>.
    /// </summary>
    public const string CommunicationAttachments = "communication-attachments";

    /// <summary>
    /// Queued full-dashboard Excel exports. Blobs are keyed by <c>{exportId}.xlsx</c>.
    /// Azure container: <c>report-exports</c> in <c>ststarterkit{env}</c>.
    /// </summary>
    public const string ReportExports = "report-exports";

    /// <summary>
    /// Chat message media attachments (photos, video, PDFs — the identity split). Blobs are keyed by
    /// <c>{messageId}/{fileName}</c>.
    /// Azure container: <c>message-attachments</c> in <c>ststarterkit{env}</c>.
    /// </summary>
    public const string MessageAttachments = "message-attachments";
}
