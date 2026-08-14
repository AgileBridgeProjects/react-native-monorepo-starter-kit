namespace StarterKit.Core.Dev.Options;

/// <summary>
/// Local-dev-only clock override. When <see cref="OverrideUtc"/> is set,
/// <see cref="DevClockTimeProvider"/> freezes <c>TimeProvider.GetUtcNow()</c> to this instant
/// instead of advancing in real time, so a developer can pin "now" to any US-zone
/// morning/afternoon/evening without waiting for real time to align or working odd hours.
/// Null/empty (the default) means real time — unchanged behaviour.
/// Never bind this outside <see cref="DevClockGate.IsLocalDevelopment"/> — see that type for why.
/// </summary>
public sealed class DevClockOptions
{
    public const string SectionName = "DevClock";

    /// <summary>ISO-8601 UTC instant, e.g. "2026-07-29T21:30:00Z". Null/empty = real time.</summary>
    public string? OverrideUtc { get; init; }
}
