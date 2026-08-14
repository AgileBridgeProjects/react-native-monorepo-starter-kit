namespace StarterKit.Core.Caching.Interfaces;

/// <summary>
/// Generic cache service abstraction over <see cref="Microsoft.Extensions.Caching.Distributed.IDistributedCache"/>.
/// Backed by in-memory storage now; swap the registration to Redis for multi-instance deployments.
/// </summary>
public interface ICacheService
{
    /// <summary>
    /// Returns the cached value for <paramref name="key"/> if present; otherwise invokes
    /// <paramref name="factory"/>, stores the result under <paramref name="key"/> with
    /// <paramref name="ttl"/>, and returns it. Returns <see langword="null"/> only when
    /// the factory itself returns <see langword="null"/>.
    /// </summary>
    Task<T?> GetOrCreateAsync<T>(
        string key,
        Func<CancellationToken, Task<T>> factory,
        TimeSpan ttl,
        CancellationToken cancellationToken = default
    )
        where T : class;

    /// <summary>
    /// Stores <paramref name="value"/> under <paramref name="key"/> with an absolute <paramref name="ttl"/>.
    /// Use this to explicitly set (or overwrite) a cache entry — e.g. for cache-busting tokens.
    /// </summary>
    Task SetAsync<T>(
        string key,
        T value,
        TimeSpan ttl,
        CancellationToken cancellationToken = default
    )
        where T : class;

    /// <summary>Removes the entry at <paramref name="key"/> if it exists.</summary>
    Task RemoveAsync(string key, CancellationToken cancellationToken = default);
}
