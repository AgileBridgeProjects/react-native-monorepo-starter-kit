using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using StarterKit.Core.Caching.Interfaces;

namespace StarterKit.Core.Caching;

/// <summary>
/// <see cref="ICacheService"/> implementation backed by <see cref="IDistributedCache"/>.
/// Registered with <c>AddDistributedMemoryCache()</c> for single-instance deployments;
/// swap to <c>AddStackExchangeRedisCache()</c> for multi-instance without changing callers.
/// </summary>
internal sealed class DistributedCacheService(
    IDistributedCache cache,
    ILogger<DistributedCacheService> logger
) : ICacheService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = null,
        // IgnoreCycles prevents JsonException when EF Core relationship fixup sets back-reference
        // navigation properties on AsNoTracking entities (e.g. GameCategoryType.GameCategory →
        // parent GameCategory). Back-references are omitted from the JSON; callers only access
        // the forward collections (Types, DifficultyRatios) after deserialization.
        ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles,
    };

    /// <inheritdoc />
    public async Task<T?> GetOrCreateAsync<T>(
        string key,
        Func<CancellationToken, Task<T>> factory,
        TimeSpan ttl,
        CancellationToken cancellationToken = default
    )
        where T : class
    {
        var bytes = await cache.GetAsync(key, cancellationToken);
        if (bytes is not null)
        {
            try
            {
                return JsonSerializer.Deserialize<T>(bytes, JsonOptions);
            }
            catch (JsonException ex)
            {
                // Corrupted or incompatible cached value — evict and re-fetch.
                logger.LogWarning(
                    ex,
                    "Cache deserialization failed for key '{Key}'. Evicting and re-fetching.",
                    key
                );
                await cache.RemoveAsync(key, cancellationToken);
            }
        }

        var value = await factory(cancellationToken);
        if (value is null)
            return null;

        await StoreAsync(key, value, ttl, cancellationToken);
        return value;
    }

    /// <inheritdoc />
    public async Task SetAsync<T>(
        string key,
        T value,
        TimeSpan ttl,
        CancellationToken cancellationToken = default
    )
        where T : class
    {
        await StoreAsync(key, value, ttl, cancellationToken);
    }

    /// <inheritdoc />
    public Task RemoveAsync(string key, CancellationToken cancellationToken = default) =>
        cache.RemoveAsync(key, cancellationToken);

    private async Task StoreAsync<T>(
        string key,
        T value,
        TimeSpan ttl,
        CancellationToken cancellationToken
    )
    {
        var bytes = JsonSerializer.SerializeToUtf8Bytes(value, JsonOptions);
        var options = new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl };
        await cache.SetAsync(key, bytes, options, cancellationToken);
    }
}
