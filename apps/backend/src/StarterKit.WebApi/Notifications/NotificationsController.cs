using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StarterKit.Auth.Permissions;
using StarterKit.Core.Notifications.DTOs;
using StarterKit.Core.Notifications.Interfaces.Services;
using StarterKit.Data.Notifications.Models;
using StarterKit.WebApi.Notifications.DTOs;
using StarterKit.WebApi.Notifications.Interfaces;
using StarterKit.WebApi.Notifications.Mappers;

namespace StarterKit.WebApi.Notifications;

[ApiController]
[Route("api/notifications")]
[Tags("Notifications")]
[Authorize]
public sealed class NotificationsController(
    ICommunicationsService communicationsService,
    INotificationMessageService notificationMessageService
) : ControllerBase, INotificationsController
{
    /// <summary>
    /// Sends an admin-composed email to all active users in the specified clubs and/or teams.
    /// Only users with valid email addresses receive the message.
    /// </summary>
    [HttpPost("send-email")]
    [Authorize(Policy = StarterKitPermissions.Notifications.Send)]
    [ProducesResponseType(typeof(SendEmailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SendEmailResponse>> SendEmailAsync(
        [FromBody] SendEmailRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var result = await communicationsService.SendEmailAsync(
            new SendEmailCommand(
                ClubIds: request.ClubIds ?? [],
                TeamIds: request.TeamIds ?? [],
                Subject: request.Subject,
                Message: request.Message,
                Attachments: request.Attachments.ToEmailAttachments()
            ),
            cancellationToken
        );

        return Ok(new SendEmailResponse(result.TotalRecipients, result.Delivered, result.Failed));
    }

    /// <summary>
    /// Sends an admin-composed SMS to all active users in the specified clubs and/or teams.
    /// Only users with valid phone numbers receive the message.
    /// </summary>
    [HttpPost("send-sms")]
    [Authorize(Policy = StarterKitPermissions.Notifications.Send)]
    [ProducesResponseType(typeof(SendSmsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SendSmsResponse>> SendSmsAsync(
        [FromBody] SendSmsRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var result = await communicationsService.SendSmsAsync(
            new SendSmsCommand(
                ClubIds: request.ClubIds ?? [],
                TeamIds: request.TeamIds ?? [],
                Message: request.Message
            ),
            cancellationToken
        );

        return Ok(new SendSmsResponse(result.TotalRecipients, result.Delivered, result.Failed));
    }

    /// <summary>
    /// Returns a paginated list of notification messages with optional filtering.
    /// </summary>
    [HttpGet("messages")]
    [Authorize(Policy = StarterKitPermissions.Notifications.ViewHistory)]
    [ProducesResponseType(typeof(NotificationMessageListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<NotificationMessageListResponse>> ListMessagesAsync(
        [FromQuery] NotificationMessageListQuery query,
        CancellationToken cancellationToken = default
    )
    {
        var result = await notificationMessageService.ListAsync(
            query.ClubId,
            query.ClampedPage,
            query.ClampedPageSize,
            query.Status,
            query.Channel,
            query.FilterText,
            query.SortBy,
            query.SortDescending,
            cancellationToken
        );

        return Ok(
            new NotificationMessageListResponse
            {
                Items = result.Items.Select(m => m.ToResponse()).ToList(),
                TotalCount = result.TotalCount,
                Page = result.Page,
                PageSize = result.PageSize,
                HasNextPage = result.HasNextPage,
            }
        );
    }

    /// <summary>
    /// Returns a single notification message by ID.
    /// </summary>
    [HttpGet("messages/{id:guid}")]
    [Authorize(Policy = StarterKitPermissions.Notifications.ViewHistory)]
    [ProducesResponseType(typeof(NotificationMessageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<NotificationMessageResponse>> GetMessageAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var entity = await notificationMessageService.GetAsync(id, cancellationToken);
        return Ok(entity.ToResponse());
    }

    /// <summary>
    /// Creates a new notification message (draft).
    /// </summary>
    [HttpPost("messages")]
    [Authorize(Policy = StarterKitPermissions.Notifications.Send)]
    [ProducesResponseType(typeof(NotificationMessageResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<NotificationMessageResponse>> CreateMessageAsync(
        [FromBody] CreateNotificationMessageRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var entity = await notificationMessageService.CreateAsync(
            request.Subject,
            request.Message,
            request.Channel,
            request.ClubId,
            request.TeamId,
            request.Attachments.ToAttachmentInputs(),
            request.MediaAttachment?.ToAttachmentInput(),
            cancellationToken
        );

        return CreatedAtAction("GetMessage", new { id = entity.Id }, entity.ToResponse());
    }

    /// <summary>
    /// Updates an existing draft notification message.
    /// </summary>
    [HttpPut("messages/{id:guid}")]
    [Authorize(Policy = StarterKitPermissions.Notifications.Send)]
    [ProducesResponseType(typeof(NotificationMessageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<NotificationMessageResponse>> UpdateMessageAsync(
        Guid id,
        [FromBody] UpdateNotificationMessageRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var entity = await notificationMessageService.UpdateAsync(
            id,
            request.Subject,
            request.Message,
            request.Channel,
            request.ClubId,
            request.TeamId,
            request.Attachments.ToAttachmentInputs(),
            request.MediaAttachment?.ToAttachmentInput(),
            request.ClearMedia,
            cancellationToken
        );

        return Ok(entity.ToResponse());
    }

    /// <summary>
    /// Deletes a notification message.
    /// </summary>
    [HttpDelete("messages/{id:guid}")]
    [Authorize(Policy = StarterKitPermissions.Notifications.Send)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteMessageAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        await notificationMessageService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// Sends a notification message to its configured recipients.
    /// Optionally accepts file attachments to include with the email.
    /// The notification is queued for background delivery and returns immediately.
    /// </summary>
    [HttpPost("messages/{id:guid}/send")]
    [Authorize(Policy = StarterKitPermissions.Notifications.Send)]
    [ProducesResponseType(typeof(NotificationMessageResponse), StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<NotificationMessageResponse>> SendMessageAsync(
        Guid id,
        [FromBody] SendNotificationRequest? request = null,
        CancellationToken cancellationToken = default
    )
    {
        var entity = await notificationMessageService.SendAsync(
            id,
            request?.Attachments.ToEmailAttachments(),
            cancellationToken
        );
        return Accepted(entity.ToResponse());
    }
}
