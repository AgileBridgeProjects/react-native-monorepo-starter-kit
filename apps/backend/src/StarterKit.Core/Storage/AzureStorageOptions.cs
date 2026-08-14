namespace StarterKit.Core.Storage;

/// <summary>
/// Strongly-typed configuration for Azure Blob Storage.
/// Bound from the <c>AzureStorage</c> section of appsettings.
///
/// Two modes of operation:
/// <list type="bullet">
///   <item><description>
///     <b>Managed Identity (deployed)</b> — set <c>AccountName</c> via Key Vault secret
///     <c>azurestorage--accountname</c>. <c>ConnectionString</c> is not required.
///   </description></item>
///   <item><description>
///     <b>Azurite (docker-compose / local)</b> — set <c>AzureStorage__ConnectionString</c>
///     in the docker-compose environment block. <c>AccountName</c> is ignored.
///   </description></item>
/// </list>
/// </summary>
public sealed class AzureStorageOptions
{
    /// <summary>The configuration section name.</summary>
    public const string SectionName = "AzureStorage";

    /// <summary>
    /// Azure Storage account name (e.g. <c>ststarterkitdev</c>).
    /// Required when <see cref="ConnectionString"/> is not set.
    /// In deployed environments this is injected by Key Vault at startup.
    /// <c>appsettings.json</c> holds a <c>#</c> placeholder — never commit a real value.
    /// </summary>
    public string? AccountName { get; init; }

    /// <summary>
    /// Full Azure Storage connection string.
    /// When set (non-empty, non-<c>#</c>), used directly to construct the
    /// <c>BlobServiceClient</c> — bypasses <see cref="AccountName"/> and
    /// <c>DefaultAzureCredential</c> entirely.
    ///
    /// Used in docker-compose to point at Azurite so the real dev storage account
    /// is never touched during local development or CI runs.
    ///
    /// The Azurite well-known connection string is safe to commit.
    /// Never commit a real Azure Storage account connection string.
    /// </summary>
    public string? ConnectionString { get; init; }

    /// <summary>
    /// Optional public base URL for blob storage (e.g.
    /// <c>http://localhost:10000/devstoreaccount1</c> in docker-compose).
    ///
    /// When set, blob URIs returned to clients are rewritten from the internal
    /// service host (e.g. <c>azurite:10000</c>) to this browser-reachable base.
    /// Leave unset in deployed environments — the real Azure Storage endpoint is
    /// already publicly reachable.
    /// </summary>
    public string? PublicBlobEndpoint { get; init; }

    /// <summary>
    /// How long a generated SAS URL remains valid, in hours.
    /// Defaults to 24 hours. Applies to both connection-string (Azurite) and
    /// Managed Identity (deployed) modes.
    /// </summary>
    public int SasExpiryHours { get; init; } = 24;

    /// <summary>
    /// <see langword="true"/> when a real connection string has been provided
    /// (i.e. <see cref="ConnectionString"/> is non-empty and not the <c>#</c> placeholder).
    /// </summary>
    public bool UseConnectionString =>
        !string.IsNullOrWhiteSpace(ConnectionString) && ConnectionString != "#";
}
