using System.ComponentModel.DataAnnotations;

namespace StarterKit.Core.Configuration;

/// <summary>
/// Shared retry configuration. Bind to any config section that defines
/// MaxRetries and RetryDelayMilliseconds.
/// </summary>
public sealed class RetryOptions
{
    [Range(1, 100)]
    public int MaxRetries { get; init; } = 3;

    [Range(1, 60_000)]
    public int RetryDelayMilliseconds { get; init; } = 500;

    public TimeSpan RetryDelay => TimeSpan.FromMilliseconds(RetryDelayMilliseconds);
}
