using StarterKit.Core.Notifications.DTOs;

namespace StarterKit.Core.Notifications.Interfaces.Services;

public interface ICommunicationsService
{
    /// <summary>
    /// Sends an admin-composed email to all active users in the specified clubs and/or
    /// teams that have a valid email address.
    /// </summary>
    /// <param name="command">Recipients, subject, body, and optional attachments.</param>
    /// <param name="cancellationToken"></param>
    /// <returns>Delivery summary: total eligible recipients, delivered count, failed count.</returns>
    Task<DispatchResult> SendEmailAsync(
        SendEmailCommand command,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Sends an admin-composed SMS to all active users in the specified clubs and/or
    /// teams that have a valid phone number.
    /// </summary>
    /// <param name="command">Recipients and message body.</param>
    /// <param name="cancellationToken"></param>
    /// <returns>Delivery summary: total eligible recipients, delivered count, failed count.</returns>
    Task<DispatchResult> SendSmsAsync(
        SendSmsCommand command,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Creates in-app notification-centre messages for all active users in the specified
    /// clubs and/or teams.
    /// </summary>
    /// <param name="command">Recipients, subject, and message body.</param>
    /// <param name="cancellationToken"></param>
    /// <returns>Delivery summary: total eligible recipients, delivered count, failed count.</returns>
    Task<DispatchResult> SendInAppAsync(
        SendInAppCommand command,
        CancellationToken cancellationToken = default
    );
}
