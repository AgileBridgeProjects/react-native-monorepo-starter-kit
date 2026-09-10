using System.ComponentModel.DataAnnotations;

namespace StarterKit.Core.Caching.Options;

/// <summary>
/// Configuration for cache TTL values, bound from <c>appsettings.json "Cache"</c> section.
/// All values are in seconds.
/// </summary>
public sealed class CacheOptions
{
    public const string SectionName = "Cache";

    /// <summary>
    /// Example TTL, bound from the <c>Cache</c> section. Replace with your own profiles;
    /// the pattern is one option per cache profile so a TTL is changeable without a deploy.
    /// </summary>
    public int UserPreferencesTtlSeconds { get; init; } = 300;

    public TimeSpan UserPreferencesTtl => TimeSpan.FromSeconds(UserPreferencesTtlSeconds);
}
