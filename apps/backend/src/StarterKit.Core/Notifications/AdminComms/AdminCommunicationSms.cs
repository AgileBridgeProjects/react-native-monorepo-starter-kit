using StarterKit.Core.Notifications.DTOs;
using StarterKit.Core.Notifications.Enums;

namespace StarterKit.Core.Notifications.AdminComms;

/// <summary>
/// An admin-composed broadcast SMS sent to a club or team.
/// The body is provided at call-site by the Tenant Admin.
/// </summary>
public sealed class AdminCommunicationSms : Notification
{
    public required string Message { get; init; }

    public override NotificationChannel SupportedChannels => NotificationChannel.Sms;

    public override SmsPayload BuildSms() => new(Body: Message);
}
