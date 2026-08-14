namespace StarterKit.Core.Notifications;

/// <summary>
/// Hard limits for SMS messages — referenced by the API DTO, the Core service
/// validation, and the frontend dialog.
/// </summary>
public static class SmsLimits
{
    /// <summary>
    /// Maximum length of a single-segment SMS using GSM-7 encoding.
    /// Any longer message would be split into multiple segments (and billed accordingly).
    /// </summary>
    public const int MaxMessageLength = 160;
}
