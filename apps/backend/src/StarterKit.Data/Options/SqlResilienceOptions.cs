using System.ComponentModel.DataAnnotations;

namespace StarterKit.Data.Options;

public sealed class SqlResilienceOptions
{
    public const string SectionName = "SqlResilience";

    [Range(1, 20)]
    public int MaxRetries { get; init; } = 5;

    [Range(100, 60_000)]
    public int RetryDelayMilliseconds { get; init; } = 10_000;

    public TimeSpan MaxRetryDelay => TimeSpan.FromMilliseconds(RetryDelayMilliseconds);
}
