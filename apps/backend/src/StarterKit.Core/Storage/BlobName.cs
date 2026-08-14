namespace StarterKit.Core.Storage;

/// <summary>
/// Shared utility for building consistent Azure Blob Storage object names.
/// All services that write blobs must use these helpers — never construct blob names inline.
/// </summary>
public static class BlobName
{
    /// <summary>
    /// Returns a blob name scoped to a specific entity: <c>{id}/{fileName}</c>.
    /// Keeps blobs for the same entity together under a common prefix and avoids
    /// collisions when the same file name is uploaded for different entities.
    /// </summary>
    public static string ForEntity(Guid id, string fileName) => $"{id}/{fileName}";
}
