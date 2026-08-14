using StarterKit.Core.Notifications.DTOs;
using StarterKit.Core.Notifications.Enums;

namespace StarterKit.Core.Notifications.AdminComms;

/// <summary>
/// An admin-composed broadcast email sent to a club or team.
/// The body is provided at call-site by the Tenant Admin.
/// Sends the raw HTML content directly via Resend (no template required).
/// </summary>
public sealed class AdminCommunicationEmail : Notification
{
    public required string Subject { get; init; }
    public required string Message { get; init; }
    public IReadOnlyList<EmailAttachment>? Attachments { get; init; }

    public override NotificationChannel SupportedChannels => NotificationChannel.Email;

    public override EmailPayload BuildEmail() =>
        new(Subject: Subject, HtmlContent: Message, Attachments: Attachments);
}
