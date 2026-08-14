namespace StarterKit.Core.Storage;

/// <summary>
/// Result of an auto-named blob upload, containing both the generated entity ID
/// and the stable blob path persisted in the database.
/// </summary>
public sealed record BlobUploadResult(Guid Id, string StoredPath);
