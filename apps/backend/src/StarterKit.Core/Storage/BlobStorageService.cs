using System.Text.Json.Nodes;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;
using Microsoft.Extensions.Options;
using StarterKit.Core.Resources;
using StarterKit.Core.Storage.Interfaces;
using StarterKit.Data.Extensions;

namespace StarterKit.Core.Storage;

/// <summary>
/// Azure Blob Storage implementation of <see cref="IBlobStorageService"/>.
/// Uploads blobs and generates time-limited SAS URLs so the container can stay private.
///
/// Two modes of operation:
/// <list type="bullet">
///   <item><description>
///     <b>Connection-string (Azurite / local)</b> — SAS is signed directly from the account key
///     embedded in the connection string via <see cref="BlobClient.GenerateSasUri"/>.
///   </description></item>
///   <item><description>
///     <b>Managed Identity (deployed)</b> — a User Delegation Key is obtained from Azure AD
///     and cached for up to 24 hours. Requires the <c>Storage Blob Delegator</c> role on
///     the storage account for the managed identity.
///   </description></item>
/// </list>
/// </summary>
public sealed class BlobStorageService : IBlobStorageService
{
    private readonly BlobServiceClient _client;
    private readonly AzureStorageOptions _options;
    private readonly TimeProvider _timeProvider;

    // Cached User Delegation Key for Managed Identity mode. Refreshed when it is within
    // 10 minutes of expiry. Protected by _delegationKeyLock.
    private UserDelegationKey? _cachedDelegationKey;
    private DateTime _delegationKeyExpiry = DateTime.MinValue;
    private readonly SemaphoreSlim _delegationKeyLock = new(1, 1);

    public BlobStorageService(
        BlobServiceClient client,
        IOptions<AzureStorageOptions> options,
        TimeProvider timeProvider
    )
    {
        _client = client;
        _options = options.Value;
        _timeProvider = timeProvider;
    }

    /// <inheritdoc />
    public async Task<string> UploadAsync(
        string containerName,
        string blobName,
        UploadedFile file,
        CancellationToken cancellationToken = default
    )
    {
        var containerClient = _client.GetBlobContainerClient(containerName);
        var blobClient = containerClient.GetBlobClient(blobName);

        await blobClient.UploadAsync(
            file.Content,
            new BlobHttpHeaders { ContentType = file.ContentType },
            cancellationToken: cancellationToken
        );

        // Return a stable blob path so callers can persist it without expiry concerns.
        // SAS URLs are generated at read time via GenerateSasUriAsync / ResolveStoredPathAsync.
        return $"{containerName}/{blobName}";
    }

    /// <inheritdoc />
    public async Task<BlobUploadResult> UploadAsync(
        string containerName,
        UploadedFile file,
        CancellationToken cancellationToken = default
    )
    {
        var id = Guid.NewGuid();
        var blobName = BlobName.ForEntity(id, file.FileName);
        var storedPath = await UploadAsync(containerName, blobName, file, cancellationToken);
        return new BlobUploadResult(id, storedPath);
    }

    /// <inheritdoc />
    public async Task<string> GenerateSasUriAsync(
        string containerName,
        string blobName,
        CancellationToken cancellationToken = default
    )
    {
        var containerClient = _client.GetBlobContainerClient(containerName);
        var blobClient = containerClient.GetBlobClient(blobName);
        return await GenerateSasUriInternalAsync(blobClient, cancellationToken);
    }

    /// <summary>
    /// Core SAS generation logic. Uses account-key signing (connection-string mode) or a
    /// cached User Delegation Key (Managed Identity mode).
    /// </summary>
    private async Task<string> GenerateSasUriInternalAsync(
        BlobClient blobClient,
        CancellationToken cancellationToken
    )
    {
        var expiry = _timeProvider.Now().AddHours(_options.SasExpiryHours);

        var sasBuilder = new BlobSasBuilder
        {
            BlobContainerName = blobClient.BlobContainerName,
            BlobName = blobClient.Name,
            Resource = "b",
            ExpiresOn = expiry,
        };
        sasBuilder.SetPermissions(BlobSasPermissions.Read);

        Uri sasUri;

        if (_options.UseConnectionString)
        {
            // Account-key signing — available directly from the connection string.
            sasUri = blobClient.GenerateSasUri(sasBuilder);
        }
        else
        {
            // User Delegation Key signing — requires Storage Blob Delegator role on
            // the managed identity assigned to this App Service.
            var delegationKey = await GetOrRefreshDelegationKeyAsync(cancellationToken);
            var sasSigner = new BlobUriBuilder(blobClient.Uri)
            {
                Sas = sasBuilder.ToSasQueryParameters(delegationKey, _client.AccountName),
            };
            sasUri = sasSigner.ToUri();
        }

        return RewritePublicUri(sasUri);
    }

    /// <summary>
    /// Returns the cached User Delegation Key, refreshing it if it is within 10 minutes
    /// of expiry. Thread-safe via <see cref="_delegationKeyLock"/>.
    /// </summary>
    private async Task<UserDelegationKey> GetOrRefreshDelegationKeyAsync(CancellationToken ct)
    {
        // Fast path — key still valid with buffer.
        if (
            _cachedDelegationKey is not null
            && _timeProvider.Now().AddMinutes(10) < _delegationKeyExpiry
        )
            return _cachedDelegationKey;

        await _delegationKeyLock.WaitAsync(ct);
        try
        {
            // Double-check after acquiring the lock.
            if (
                _cachedDelegationKey is not null
                && _timeProvider.Now().AddMinutes(10) < _delegationKeyExpiry
            )
                return _cachedDelegationKey;

            var now = _timeProvider.Now();
            var keyStart = now.AddMinutes(-5);
            // Key expiry matches the SAS expiry window so SAS URLs never outlive the delegation key.
            var keyExpiry = now.AddHours(_options.SasExpiryHours);
            var response = await _client.GetUserDelegationKeyAsync(keyStart, keyExpiry, ct);
            _cachedDelegationKey = response.Value;
            _delegationKeyExpiry = keyExpiry;
            return _cachedDelegationKey;
        }
        finally
        {
            _delegationKeyLock.Release();
        }
    }

    /// <summary>
    /// Rewrites the SAS URI to the public endpoint when the service is running behind
    /// an emulator (e.g. Azurite) that uses an internal hostname.
    /// </summary>
    private string RewritePublicUri(Uri sasUri)
    {
        if (string.IsNullOrEmpty(_options.PublicBlobEndpoint))
            return sasUri.ToString();

        var internalBase = _client.Uri.ToString().TrimEnd('/');
        var sasUriString = sasUri.ToString();

        // Guard: only rewrite URIs that actually start with the internal base to avoid
        // corrupted URLs from unexpected scheme/host differences.
        if (!sasUriString.StartsWith(internalBase, StringComparison.OrdinalIgnoreCase))
            return sasUriString;

        var publicBase = _options.PublicBlobEndpoint.TrimEnd('/');
        return publicBase + sasUriString[internalBase.Length..];
    }

    /// <inheritdoc />
    public async Task<string?> ResolveStoredPathAsync(
        string? storedPath,
        CancellationToken cancellationToken = default
    )
    {
        if (string.IsNullOrWhiteSpace(storedPath))
            return null;

        if (storedPath.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            // Try to extract a blob path from the URL. This handles:
            //  - Legacy Azure Blob Storage URLs (no SAS, account-name host)
            //  - Emulator / Azurite URLs (internal or public endpoint)
            //  - SAS URLs generated from previous uploads
            // When a blob path is extracted, a fresh SAS URL is generated so the caller
            // always receives a valid, correctly-routed URL.
            var extracted = TryExtractBlobPath(storedPath);
            if (extracted is not null)
            {
                var separatorIndex = extracted.IndexOf('/');
                if (separatorIndex > 0)
                {
                    var container = extracted[..separatorIndex];
                    var blobName = extracted[(separatorIndex + 1)..];
                    return await GenerateSasUriAsync(container, blobName, cancellationToken);
                }
            }

            return storedPath;
        }

        // Blob paths are stored as "{containerName}/{blobName}".
        var pathSeparatorIndex = storedPath.IndexOf('/');
        if (pathSeparatorIndex < 1)
            return storedPath; // Unrecognised format — return as-is.

        var containerName = storedPath[..pathSeparatorIndex];
        var blob = storedPath[(pathSeparatorIndex + 1)..];

        return await GenerateSasUriAsync(containerName, blob, cancellationToken);
    }

    /// <inheritdoc />
    public string? ExtractStoredPath(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return null;

        if (!url.StartsWith("http", StringComparison.OrdinalIgnoreCase))
            return url; // Already a blob path.

        return TryExtractBlobPath(url) ?? url;
    }

    /// <inheritdoc />
    public async Task<UploadedFile?> DownloadAsync(
        string? storedPath,
        CancellationToken cancellationToken = default
    )
    {
        if (string.IsNullOrWhiteSpace(storedPath))
            return null;

        string containerName;
        string blobName;

        if (storedPath.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            // The DB may store a full Azure Blob URL (with or without SAS token).
            // Extract the container/blob path by stripping the known base URI.
            var blobPath = TryExtractBlobPath(storedPath);
            if (blobPath is null)
                return null;

            var separatorIndex = blobPath.IndexOf('/');
            if (separatorIndex < 1)
                return null;

            containerName = blobPath[..separatorIndex];
            blobName = blobPath[(separatorIndex + 1)..];
        }
        else
        {
            var pathSeparatorIndex = storedPath.IndexOf('/');
            if (pathSeparatorIndex < 1)
                return null;

            containerName = storedPath[..pathSeparatorIndex];
            blobName = storedPath[(pathSeparatorIndex + 1)..];
        }

        var containerClient = _client.GetBlobContainerClient(containerName);
        var blobClient = containerClient.GetBlobClient(blobName);

        if (!await blobClient.ExistsAsync(cancellationToken))
            return null;

        var response = await blobClient.DownloadContentAsync(cancellationToken);

        var stream = new MemoryStream();
        await response.Value.Content.ToStream().CopyToAsync(stream, cancellationToken);
        stream.Position = 0;

        var fileName = blobName.Contains('/')
            ? blobName[(blobName.LastIndexOf('/') + 1)..]
            : blobName;

        return new UploadedFile(
            fileName,
            response.Value.Details.ContentType,
            stream.Length,
            stream
        );
    }

    /// <inheritdoc />
    public async Task DeletePrefixAsync(
        string containerName,
        string prefix,
        CancellationToken cancellationToken = default
    )
    {
        var containerClient = _client.GetBlobContainerClient(containerName);
        if (!await containerClient.ExistsAsync(cancellationToken))
            return;

        await foreach (
            var item in containerClient.GetBlobsAsync(
                BlobTraits.None,
                BlobStates.None,
                prefix,
                cancellationToken
            )
        )
        {
            await containerClient.DeleteBlobIfExistsAsync(
                item.Name,
                cancellationToken: cancellationToken
            );
        }
    }

    /// <inheritdoc />
    public async Task<int> DeleteOlderThanAsync(
        string containerName,
        TimeSpan age,
        CancellationToken cancellationToken = default
    )
    {
        var containerClient = _client.GetBlobContainerClient(containerName);
        if (!await containerClient.ExistsAsync(cancellationToken))
            return 0;

        var cutoff = _timeProvider.Now().Subtract(age);
        var deleted = 0;
        await foreach (
            var item in containerClient.GetBlobsAsync(
                BlobTraits.None,
                BlobStates.None,
                null,
                cancellationToken
            )
        )
        {
            if (item.Properties.LastModified is { } modified && modified.UtcDateTime < cutoff)
            {
                await containerClient.DeleteBlobIfExistsAsync(
                    item.Name,
                    cancellationToken: cancellationToken
                );
                deleted++;
            }
        }

        return deleted;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<string>> ListAsync(
        string containerName,
        string prefix,
        CancellationToken cancellationToken = default
    )
    {
        var containerClient = _client.GetBlobContainerClient(containerName);
        if (!await containerClient.ExistsAsync(cancellationToken))
            return [];

        var paths = new List<string>();
        await foreach (
            var item in containerClient.GetBlobsAsync(
                BlobTraits.None,
                BlobStates.None,
                prefix,
                cancellationToken
            )
        )
        {
            paths.Add($"{containerName}/{item.Name}");
        }

        return paths;
    }

    /// <summary>
    /// Attempts to extract the <c>{container}/{blob}</c> relative path from a full URL
    /// by matching against known service base URIs (internal endpoint, public endpoint,
    /// or <c>{AccountName}.blob.core.windows.net</c>).
    /// Returns <see langword="null"/> when the URL doesn't belong to this storage account.
    /// </summary>
    private string? TryExtractBlobPath(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
            return null;

        // Strip query string (SAS tokens) — we only need the path.
        var pathOnly = Uri.UnescapeDataString(uri.GetLeftPart(UriPartial.Path));

        // Try matching against the internal BlobServiceClient endpoint (Azurite or Azure).
        var clientUri = _client.Uri;
        if (clientUri is not null)
        {
            var internalBase = clientUri.ToString().TrimEnd('/');
            if (pathOnly.StartsWith(internalBase, StringComparison.OrdinalIgnoreCase))
                return pathOnly[(internalBase.Length + 1)..]; // +1 for the leading '/'
        }

        // Try matching against the configured public endpoint (docker-compose port mapping).
        if (!string.IsNullOrWhiteSpace(_options.PublicBlobEndpoint))
        {
            var publicBase = _options.PublicBlobEndpoint.TrimEnd('/');
            if (pathOnly.StartsWith(publicBase, StringComparison.OrdinalIgnoreCase))
                return pathOnly[(publicBase.Length + 1)..];
        }

        // Try the standard Azure format: {account}.blob.core.windows.net/{container}/{blob}
        if (
            !string.IsNullOrWhiteSpace(_options.AccountName)
            && uri.Host.Equals(
                $"{_options.AccountName}.blob.core.windows.net",
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return uri.AbsolutePath.TrimStart('/');
        }

        return null;
    }

    /// <inheritdoc />
    public async Task ResolveJsonNodeImageFieldAsync(
        JsonObject obj,
        string fieldName,
        CancellationToken cancellationToken = default
    )
    {
        // Support both camelCase (frontend) and PascalCase (serialiser default).
        string? key;
        if (obj.ContainsKey(fieldName))
            key = fieldName;
        else
        {
            var pascalName = char.ToUpperInvariant(fieldName[0]) + fieldName[1..];
            key = obj.ContainsKey(pascalName) ? pascalName : null;
        }

        if (key is null)
            return;

        var storedPath = obj[key]?.GetValue<string>();
        if (string.IsNullOrEmpty(storedPath))
            return;

        var resolved = await ResolveStoredPathAsync(storedPath, cancellationToken);
        if (resolved is not null)
            obj[key] = resolved;
    }

    /// <inheritdoc />
    public async Task DeleteAsync(string? storedPath, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(storedPath))
            return;

        // Stored paths are "{containerName}/{blobName}". Full URLs are not expected here,
        // but normalise just in case.
        var path = storedPath.StartsWith("http", StringComparison.OrdinalIgnoreCase)
            ? TryExtractBlobPath(storedPath) ?? storedPath
            : storedPath;

        var separatorIndex = path.IndexOf('/');
        if (separatorIndex < 1)
            return;

        var containerName = path[..separatorIndex];
        var blobName = path[(separatorIndex + 1)..];

        var containerClient = _client.GetBlobContainerClient(containerName);
        var blobClient = containerClient.GetBlobClient(blobName);
        await blobClient.DeleteIfExistsAsync(cancellationToken: cancellationToken);
    }
}
