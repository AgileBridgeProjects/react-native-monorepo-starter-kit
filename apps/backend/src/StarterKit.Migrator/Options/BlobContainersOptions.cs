namespace StarterKit.Migrator.Options;

/// <summary>
/// Azure Blob Storage container names that the migrator ensures exist at startup.
/// Bound from the <c>AzureStorage</c> section of appsettings so the list stays
/// in config alongside the connection string, not hardcoded in <c>Program.cs</c>.
/// </summary>
public sealed class BlobContainersOptions
{
    public const string SectionName = "AzureStorage";

    /// <summary>
    /// Container names to create (if not already present) at startup.
    /// <para>
    /// MUST mirror <c>StarterKit.Core.Storage.BlobContainerName</c> — that registry is the source
    /// of truth for which containers the app writes to, and this list is what actually creates
    /// them on deploy. The two are separate because the Migrator only references StarterKit.Data,
    /// not Core. A container missing here does not fail the deploy: it fails much later, at the
    /// first upload, as a ContainerNotFound the user sees as "message could not be sent".
    /// **Adding a constant to BlobContainerName means adding it here too.**
    /// </para>
    /// </summary>
    public string[] Containers { get; init; } =
    [
        "resources",
        "club-images",
        "user-avatars",
        "communication-attachments",
        "report-exports",
        // the identity split chat media (BlobContainerName.MessageAttachments).
        "message-attachments",
    ];
}
