using Microsoft.AspNetCore.Mvc;
using StarterKit.WebApi.Notifications.DTOs;

namespace StarterKit.WebApi.Notifications.Interfaces;

public interface INotificationsController
{
    Task<ActionResult<SendEmailResponse>> SendEmailAsync(
        SendEmailRequest request,
        CancellationToken cancellationToken
    );

    Task<ActionResult<SendSmsResponse>> SendSmsAsync(
        SendSmsRequest request,
        CancellationToken cancellationToken
    );

    Task<ActionResult<NotificationMessageListResponse>> ListMessagesAsync(
        NotificationMessageListQuery query,
        CancellationToken cancellationToken
    );

    Task<ActionResult<NotificationMessageResponse>> GetMessageAsync(
        Guid id,
        CancellationToken cancellationToken
    );

    Task<ActionResult<NotificationMessageResponse>> CreateMessageAsync(
        CreateNotificationMessageRequest request,
        CancellationToken cancellationToken
    );

    Task<ActionResult<NotificationMessageResponse>> UpdateMessageAsync(
        Guid id,
        UpdateNotificationMessageRequest request,
        CancellationToken cancellationToken
    );

    Task<IActionResult> DeleteMessageAsync(Guid id, CancellationToken cancellationToken);

    Task<ActionResult<NotificationMessageResponse>> SendMessageAsync(
        Guid id,
        SendNotificationRequest? request,
        CancellationToken cancellationToken
    );
}
