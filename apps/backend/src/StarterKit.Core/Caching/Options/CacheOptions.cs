using System.ComponentModel.DataAnnotations;

namespace StarterKit.Core.Caching.Options;

/// <summary>
/// Configuration for cache TTL values, bound from <c>appsettings.json "Cache"</c> section.
/// All values are in seconds.
/// </summary>
public sealed class CacheOptions
{
    public const string SectionName = "Cache";

    /// <summary>TTL in seconds for scoreboard ranked-row caches.</summary>
    [Range(1, 3600)]
    public int ScoreboardTtlSeconds { get; init; }

    /// <summary>TTL in seconds for the active-game-IDs club cache.</summary>
    [Range(1, 3600)]
    public int ActiveGamesTtlSeconds { get; init; }

    /// <summary>TTL in seconds for cached raw question pools (before shuffling).</summary>
    [Range(1, 3600)]
    public int QuestionPoolTtlSeconds { get; init; }

    /// <summary>TTL in seconds for cached game-category metadata (types and difficulty ratios).</summary>
    [Range(1, 3600)]
    public int QuestionCategoryTtlSeconds { get; init; }

    public TimeSpan ScoreboardTtl => TimeSpan.FromSeconds(ScoreboardTtlSeconds);
    public TimeSpan ActiveGamesTtl => TimeSpan.FromSeconds(ActiveGamesTtlSeconds);
    public TimeSpan QuestionPoolTtl => TimeSpan.FromSeconds(QuestionPoolTtlSeconds);
    public TimeSpan QuestionCategoryTtl => TimeSpan.FromSeconds(QuestionCategoryTtlSeconds);
}
