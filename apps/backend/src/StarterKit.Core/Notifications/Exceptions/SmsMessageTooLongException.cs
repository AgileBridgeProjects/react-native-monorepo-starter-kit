namespace StarterKit.Core.Notifications.Exceptions;

/// <summary>
/// Thrown when an SMS send command's message exceeds <see cref="SmsLimits.MaxMessageLength"/>.
/// </summary>
/// <remarks>
/// Extends <see cref="ArgumentException"/> so the existing global
/// <c>ArgumentExceptionHandler</c> maps it to <c>HTTP 400 Bad Request</c>.
/// </remarks>
public sealed class SmsMessageTooLongException(int actualLength)
    : ArgumentException(
        $"SMS message must not exceed {SmsLimits.MaxMessageLength} characters (was {actualLength})."
    )
{
    public int ActualLength { get; } = actualLength;
    public int MaxLength { get; } = SmsLimits.MaxMessageLength;
}
