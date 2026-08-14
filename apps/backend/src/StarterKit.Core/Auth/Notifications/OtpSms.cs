using StarterKit.Core.Notifications;
using StarterKit.Core.Notifications.DTOs;
using StarterKit.Core.Notifications.Enums;

namespace StarterKit.Core.Auth.Notifications;

/// <summary>
/// Example SMS-only notification that delivers a one-time passcode.
/// Demonstrates: single channel (SMS), no email payload.
/// </summary>
public sealed class OtpSms : Notification
{
    public required string Code { get; init; }
    public required int ExpiryMinutes { get; init; }

    public override NotificationChannel SupportedChannels => NotificationChannel.Sms;

    public override SmsPayload BuildSms() =>
        new($"Your StarterKit verification code is {Code}. It expires in {ExpiryMinutes} minutes.");
}
