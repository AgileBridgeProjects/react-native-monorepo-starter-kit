namespace StarterKit.Data.Extensions;

public static class DateOnlyExtensions
{
    /// <summary>
    /// Returns midnight UTC for this date, as a <see cref="DateTime"/> with
    /// <see cref="DateTimeKind.Utc"/>. Centralises the
    /// <c>.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc)</c> conversion, mirroring
    /// <see cref="TimeProviderExtensions.Now"/>, so any future timezone handling change is
    /// made in one place.
    /// </summary>
    public static DateTime ToUtcMidnight(this DateOnly date) =>
        date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
}
