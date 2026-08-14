using StarterKit.Core.Notifications.DTOs;

namespace StarterKit.Core.Notifications.Interfaces.Services;

public interface IEmailSender
{
    Task SendAsync(
        EmailPayload payload,
        string toEmail,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Sends a plain-text email without a rendered HTML template.
    /// Suitable for free-form messages such as support / help requests.
    /// </summary>
    Task SendPlainAsync(
        string subject,
        string plainBody,
        string toEmail,
        CancellationToken cancellationToken = default
    );
}
