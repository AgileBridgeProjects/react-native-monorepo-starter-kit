using System.Text.Json.Nodes;
using StarterKit.Core.Resources;

namespace StarterKit.Core.Storage.Interfaces;

/// <summary>
/// Abstraction over Azure Blob Storage upload operations. Implementations handle container
/// selection, URI rewriting (e.g. Azurite → localhost), and content-type headers so that
/// callers never depend on the Azure SDK directly.
/// </summary>
public interface IBlobStorageService
{
    /// <summary>
    /// Uploads <paramref name="file"/> to the specified container under
    /// <paramref name="blobName"/> and returns a stable blob path in the form
    /// <c>{containerName}/{blobName}</c>. The path is safe to persist in the database.
    /// Call <see cref="GenerateSasUriAsync"/> or <see cref="ResolveStoredPathAsync"/> at
    /// read time to produce a short-lived, client-accessible URL.
    /// </summary>
    Task<string> UploadAsync(
        string containerName,
        string blobName,
        UploadedFile file,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Generates a new <see cref="Guid"/>, builds the blob name via
    /// <see cref="BlobName.ForEntity"/>, uploads <paramref name="file"/>, and returns
    /// both the generated ID and the stable blob path. Preferred over the three-arg
    /// overload when the caller does not need to control the blob name.
    /// </summary>
    Task<BlobUploadResult> UploadAsync(
        string containerName,
        UploadedFile file,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Generates a time-limited read SAS URL for an existing blob.
    /// Use this at read time to produce short-lived URLs from stored blob paths.
    /// </summary>
    Task<string> GenerateSasUriAsync(
        string containerName,
        string blobName,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Resolves a stored blob path or legacy URL to a fresh time-limited SAS URL.
    /// <list type="bullet">
    ///   <item><description>Returns <see langword="null"/> when <paramref name="storedPath"/> is null or empty.</description></item>
    ///   <item><description>Legacy Azure Blob Storage URLs that match the configured account are converted to SAS URLs.</description></item>
    ///   <item><description>Truly external HTTP/HTTPS URLs (non-blob-storage) are returned unchanged.</description></item>
    ///   <item><description>Stored blob paths (<c>{container}/{blob}</c>) are resolved to fresh SAS URLs.</description></item>
    /// </list>
    /// </summary>
    Task<string?> ResolveStoredPathAsync(
        string? storedPath,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Extracts the stable blob path (<c>{container}/{blob}</c>) from a full URL
    /// (SAS URL, legacy Azure URL, or emulator URL). Returns the input unchanged
    /// when it is already a blob path, null, or an unrecognised external URL.
    /// Use this to normalise values before persisting them in the database.
    /// </summary>
    string? ExtractStoredPath(string? url);

    /// <summary>
    /// Downloads the content of a blob identified by its stored path (<c>{container}/{blob}</c>).
    /// Returns <see langword="null"/> when the path is null/empty or the blob does not exist.
    /// The caller is responsible for disposing the returned stream.
    /// </summary>
    Task<UploadedFile?> DownloadAsync(
        string? storedPath,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Deletes the blob identified by its stored path (<c>{container}/{blob}</c>).
    /// No-ops when <paramref name="storedPath"/> is null, empty, or the blob does not exist.
    /// </summary>
    Task DeleteAsync(string? storedPath, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes every blob whose name starts with <paramref name="prefix"/> in the container.
    /// No-op when the container does not exist. Used to drop a candidate group on commit/cancel.
    /// </summary>
    Task DeletePrefixAsync(
        string containerName,
        string prefix,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Deletes blobs in the container last modified before <c>now − age</c> and returns the number
    /// removed. No-op (returns 0) when the container does not exist. Used by the candidate-purge job.
    /// </summary>
    Task<int> DeleteOlderThanAsync(
        string containerName,
        TimeSpan age,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lists the stable stored paths (<c>{container}/{blob}</c>) of every blob whose name starts with
    /// <paramref name="prefix"/>. Returns an empty list when the container does not exist.
    /// </summary>
    Task<IReadOnlyList<string>> ListAsync(
        string containerName,
        string prefix,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Resolves a single image-path field on a <see cref="JsonObject"/> in place.
    /// Looks up <paramref name="fieldName"/> (with camelCase/PascalCase fallback),
    /// calls <see cref="ResolveStoredPathAsync"/> on the stored value, and writes the
    /// resulting SAS URL back into the node. No-ops when the field is absent or empty.
    /// </summary>
    Task ResolveJsonNodeImageFieldAsync(
        JsonObject obj,
        string fieldName,
        CancellationToken cancellationToken = default
    );
}
