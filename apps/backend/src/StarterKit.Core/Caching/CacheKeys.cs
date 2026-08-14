namespace StarterKit.Core.Caching;

/// <summary>
/// Centralised cache key builders. Each static method is the single source of truth for that
/// key's shape — never string-interpolate a cache key at the call site.
/// </summary>
public static class CacheKeys
{
    /// <summary>
    /// The current user's in-progress DISC assessment session — shuffled question/option
    /// order plus answers-so-far. Scoped by club then user per the tenant-safety rule in
    /// docs/standards/caching.md.
    /// </summary>
    public static string DiscSessionKey(Guid clubId, Guid userId) =>
        $"disc:session:{clubId}:{userId}";
}
