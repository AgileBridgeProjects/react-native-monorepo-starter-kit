namespace StarterKit.Core.Caching;

/// <summary>
/// Centralised cache key builders. Each static method is the single source of truth for that
/// key's shape — never string-interpolate a cache key at the call site.
/// </summary>
/// <remarks>
/// The example below is the shape to copy, not a key the kit uses. Note the tenant segment:
/// every key for tenant-scoped data must carry the club id, or one tenant serves another
/// tenant's cached rows. See docs/standards/caching.md § Tenant safety.
/// </remarks>
public static class CacheKeys
{
    /// <summary>
    /// Example: a per-user, per-tenant entry. Delete this once you have a real key.
    /// </summary>
    public static string UserPreferencesKey(Guid clubId, Guid userId) =>
        $"user-preferences:{clubId}:{userId}";
}
