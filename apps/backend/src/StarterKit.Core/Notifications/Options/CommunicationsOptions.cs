using System.ComponentModel.DataAnnotations;

namespace StarterKit.Core.Notifications.Options;

public sealed class CommunicationsOptions
{
    public const string SectionName = "Communications";

    /// <summary>
    /// Maximum number of concurrent dispatch operations for email/SMS sending.
    /// </summary>
    [Range(1, 100)]
    public int MaxDegreeOfParallelism { get; init; } = 10;
}
