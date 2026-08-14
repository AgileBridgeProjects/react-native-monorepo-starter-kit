using System.ComponentModel.DataAnnotations;

namespace StarterKit.Migrator.Options;

public sealed class RetryOptions
{
    public const string SectionName = "Retry";

    [Range(1, 100)]
    public int MaxRetries { get; init; }

    [Range(1, 60_000)]
    public int RetryDelayMilliseconds { get; init; }
}
