using StarterKit.Core.Notifications.DTOs;
using StarterKit.Core.Notifications.Enums;

namespace StarterKit.Core.Notifications;

/// <summary>
/// Base class for all StarterKit notifications.
///
/// Each concrete notification is a single self-contained class that declares
/// which channels it supports and builds the payloads for those channels.
/// The dispatcher handles routing — notification classes never call senders directly.
///
/// Placement convention: notifications live in their feature folder, not in a central
/// Notifications/ folder. For example:
///   StarterKit.Auth/Services/SetupEmailService.cs (uses IEmailSender directly)
/// </summary>
public abstract class Notification
{
    /// <summary>
    /// The channels this notification can be sent on.
    /// Use <see cref="NotificationChannel.Email"/>, <see cref="NotificationChannel.Sms"/>,
    /// or <see cref="NotificationChannel.All"/> for both.
    /// </summary>
    public abstract NotificationChannel SupportedChannels { get; }

    /// <summary>
    /// Build the email payload. Override when <see cref="SupportedChannels"/> includes Email.
    /// Returning null skips the email channel even if it is requested.
    /// </summary>
    public virtual EmailPayload? BuildEmail() => null;

    /// <summary>
    /// Build the SMS payload. Override when <see cref="SupportedChannels"/> includes Sms.
    /// Returning null skips the SMS channel even if it is requested.
    /// </summary>
    public virtual SmsPayload? BuildSms() => null;
}
