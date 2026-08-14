namespace StarterKit.Core.Notifications.DTOs;

/// <summary>
/// Data needed to send a single transactional email via Resend.
/// <para>
/// When <see cref="TemplateKey"/> is set, the email is rendered locally from an embedded HTML
/// template (see <see cref="Services.EmailTemplateRenderer"/>) using <see cref="TemplateData"/>.
/// When <see cref="TemplateKey"/> is null, the email is sent with raw <see cref="HtmlContent"/>.
/// </para>
/// </summary>
public sealed record EmailPayload(
    string? Subject = null,
    string? TemplateKey = null,
    object? TemplateData = null,
    string? HtmlContent = null,
    string? FromEmailOverride = null,
    string? FromNameOverride = null,
    IReadOnlyList<EmailAttachment>? Attachments = null
);
