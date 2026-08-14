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
    /// Default TTL for scoreboard ranked-row caches (main and category).
    /// Scoreboard data is considered stale after this window; a game session
    /// completion also triggers immediate eviction regardless of TTL.
    /// </summary>
    public static readonly TimeSpan Scoreboard = TimeSpan.FromSeconds(60);

    /// <summary>
    /// Default TTL for the active-game-IDs cache (club-level).
    /// Game schedule changes are infrequent; this can be longer than the scoreboard TTL.
    /// </summary>
    public static readonly TimeSpan ActiveGames = TimeSpan.FromSeconds(300);

    /// <summary>
    /// TTL for per-team eviction tokens. Should exceed the data TTLs so that
    /// orphaned row-cache entries always expire before the token that references them
    /// is regenerated, preventing stale-key reuse.
    /// </summary>
    public static readonly TimeSpan ScoreboardToken = TimeSpan.FromHours(1);

    /// <summary>
    /// Default TTL for cached raw question pools (before shuffling).
    /// Intentionally the same as <see cref="QuestionCategory"/> so both caches expire together —
    /// preventing a window where a fresh pool is fetched using stale category types.
    /// </summary>
    public static readonly TimeSpan QuestionPool = TimeSpan.FromMinutes(5);

    /// <summary>
    /// Default TTL for cached game-category metadata (enabled types and difficulty ratios).
    /// Must match or be shorter than <see cref="QuestionPool"/> so the category is always
    /// refetched before the pool on expiry.
    /// </summary>
    public static readonly TimeSpan QuestionCategory = TimeSpan.FromMinutes(5);
}
