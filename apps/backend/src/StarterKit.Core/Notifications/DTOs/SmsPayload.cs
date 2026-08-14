namespace StarterKit.Core.Notifications.DTOs;

/// <summary>
/// Data needed to send a single SMS via Twilio.
/// </summary>
public sealed record SmsPayload(string Body);
