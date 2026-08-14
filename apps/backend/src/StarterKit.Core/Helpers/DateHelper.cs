namespace StarterKit.Core.Helpers;

public static class DateHelper
{
    /// <summary>
    /// Canonical wire/display date format (ISO 8601 date). All API date strings and
    /// exported date values must use this single format.
    /// </summary>
    public const string IsoDateFormat = "yyyy-MM-dd";

    public static DateOnly StartOfIsoWeek(DateOnly date)
    {
        var day = date.DayOfWeek;
        var delta = day == DayOfWeek.Sunday ? -6 : -(int)day + 1;
        return date.AddDays(delta);
    }

    public static string ToIsoDateString(this DateOnly date) => date.ToString(IsoDateFormat);

    public static string ToIsoDateString(this DateTime date) => date.ToString(IsoDateFormat);

    public static string ToIsoDateString(this DateTimeOffset date) => date.ToString(IsoDateFormat);
}
