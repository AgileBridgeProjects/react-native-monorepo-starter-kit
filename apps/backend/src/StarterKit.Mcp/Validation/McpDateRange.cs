using ValidationException = StarterKit.Data.Exceptions.ValidationException;

namespace StarterKit.Mcp.Validation;

/// <summary>
/// MCP counterpart of the WebApi's <c>[ValidateDateRange]</c> action filter. MVC action filters do
/// not run for MCP tool invocations, so a reporting tool that just declared the attribute would
/// silently accept ranges the REST endpoint rejects. Call this at the top of any tool whose
/// controller action carries <c>[ValidateDateRange]</c>.
/// </summary>
public static class McpDateRange
{
    public const int DefaultMaxDays = 365;

    /// <param name="maxDays">Maximum span in days; null skips the span check.</param>
    public static void EnsureValid(DateOnly from, DateOnly to, int? maxDays = DefaultMaxDays)
    {
        if (from > to)
            throw new ValidationException(
                "The 'from' date must be on or before the 'to' date.",
                "invalid-date-range"
            );

        if (maxDays is int max && to.DayNumber - from.DayNumber > max)
            throw new ValidationException(
                $"Date range cannot exceed {max} days.",
                "date-range-too-large"
            );
    }
}
