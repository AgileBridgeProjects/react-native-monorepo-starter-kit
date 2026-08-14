namespace StarterKit.Data.Extensions;

public static class TimeProviderExtensions
{
    /// <summary>
    /// Returns the current UTC time as a <see cref="DateTime"/> with
    /// <see cref="DateTimeKind.Utc"/>. Centralises the <c>.GetUtcNow().UtcDateTime</c>
    /// chain so that any future timezone or precision change is made in one place.
    /// </summary>
    public static DateTime Now(this TimeProvider clock) => clock.GetUtcNow().UtcDateTime;
}
