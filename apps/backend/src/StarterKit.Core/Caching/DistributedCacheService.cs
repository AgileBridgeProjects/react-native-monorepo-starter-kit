using System.Collections.Concurrent;
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
    /// <summary>
    /// One gate per cache key, so a miss runs the factory once instead of once per caller.
    /// Without it every concurrent request for a cold key runs the same query: the cache
    /// saves nothing at exactly the moment it is needed most, which is the stampede.
    /// </summary>
    /// <remarks>
    /// Static because the gate has to outlive the scoped service instances contending for it.
    /// Entries are never removed: a bounded set of cache keys means a bounded set of
    /// semaphores, and removing one while a caller is waiting on it is a race with no upside.
    /// If keys ever become unbounded (per-entity keys, say), this needs an eviction policy.
    /// </remarks>
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> KeyGates = new();

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

        var gate = KeyGates.GetOrAdd(key, static _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(cancellationToken);
        try
        {
            // Re-read inside the gate: whoever held it before us has just populated the key,
            // and running the factory again would defeat the point of waiting.
            var populated = await cache.GetAsync(key, cancellationToken);
            if (populated is not null)
            {
                try
                {
                    return JsonSerializer.Deserialize<T>(populated, JsonOptions);
                }
                catch (JsonException ex)
                {
                    logger.LogWarning(
                        ex,
                        "Cache deserialization failed for key '{Key}' after waiting. Re-fetching.",
                        key
                    );
                }
            }

            var value = await factory(cancellationToken);
            if (value is null)
                return null;

            await StoreAsync(key, value, ttl, cancellationToken);
            return value;
        }
        finally
        {
            gate.Release();
        }
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
