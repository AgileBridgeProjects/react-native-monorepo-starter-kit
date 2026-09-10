namespace StarterKit.Core.Caching;

/// <summary>
/// Centralised TTL defaults for all cache profiles.
/// Actual values are configurable via <see cref="Options.CacheOptions"/> and
/// <c>appsettings.json</c> — these constants are the fallback only for tests and
/// contexts where the Options infrastructure is unavailable.
/// </summary>
public static class CacheProfiles
{
    /// <summary>
    /// Example profile, paired with <see cref="CacheKeys.UserPreferencesKey"/>. Replace it
    /// with your own; the point of the pair is that a TTL is declared next to the key it
    /// governs rather than at the call site.
    /// </summary>
    public static readonly TimeSpan UserPreferences = TimeSpan.FromMinutes(5);
}
