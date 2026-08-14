using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using ModelContextProtocol.Server;
using StarterKit.Auth.Permissions;
using StarterKit.Core.Notifications.DTOs;
using StarterKit.Core.Notifications.Interfaces.Services;
using StarterKit.WebApi.Notifications.DTOs;
using StarterKit.WebApi.Notifications.Mappers;

namespace StarterKit.WebApi.Notifications.Mcp;

/// <summary>MCP tools mirroring <see cref="NotificationsController"/> 1:1.</summary>
[McpServerToolType]
public sealed class NotificationsMcpTools(
    ICommunicationsService communicationsService,
    INotificationMessageService notificationMessageService
)
{
    [McpServerTool(Name = "notifications_send_email")]
    [Authorize(Policy = StarterKitPermissions.Notifications.Send)]
    [Description(
        "Sends an admin-composed email to all active users in the specified clubs and/or teams. Only users with valid email addresses receive the message."
    )]
    public async Task<SendEmailResponse> SendEmailAsync(
        SendEmailRequest request,
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

        return new SendEmailResponse(result.TotalRecipients, result.Delivered, result.Failed);
    }

    [McpServerTool(Name = "notifications_send_sms")]
    [Authorize(Policy = StarterKitPermissions.Notifications.Send)]
    [Description(
        "Sends an admin-composed SMS to all active users in the specified clubs and/or teams. Only users with valid phone numbers receive the message."
    )]
    public async Task<SendSmsResponse> SendSmsAsync(
        SendSmsRequest request,
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

        return new SendSmsResponse(result.TotalRecipients, result.Delivered, result.Failed);
    }

    [McpServerTool(Name = "notifications_list_messages", ReadOnly = true)]
    [Authorize(Policy = StarterKitPermissions.Notifications.ViewHistory)]
    [Description("Returns a paginated list of notification messages with optional filtering.")]
    public async Task<NotificationMessageListResponse> ListMessagesAsync(
        [Description(
            "Club scope (required) plus paging, sorting, status/channel and free-text filters."
        )]
            NotificationMessageListQuery query,
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

        return new NotificationMessageListResponse
        {
            Items = result.Items.Select(m => m.ToResponse()).ToList(),
            TotalCount = result.TotalCount,
            Page = result.Page,
            PageSize = result.PageSize,
            HasNextPage = result.HasNextPage,
        };
    }

    [McpServerTool(Name = "notifications_get_message", ReadOnly = true)]
    [Authorize(Policy = StarterKitPermissions.Notifications.ViewHistory)]
    [Description("Returns a single notification message by ID.")]
    public async Task<NotificationMessageResponse> GetMessageAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var entity = await notificationMessageService.GetAsync(id, cancellationToken);
        return entity.ToResponse();
    }

    [McpServerTool(Name = "notifications_create_message")]
    [Authorize(Policy = StarterKitPermissions.Notifications.Send)]
    [Description("Creates a new notification message (draft).")]
    public async Task<NotificationMessageResponse> CreateMessageAsync(
        CreateNotificationMessageRequest request,
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

        return entity.ToResponse();
    }

    [McpServerTool(Name = "notifications_update_message", Idempotent = true)]
    [Authorize(Policy = StarterKitPermissions.Notifications.Send)]
    [Description("Updates an existing draft notification message.")]
    public async Task<NotificationMessageResponse> UpdateMessageAsync(
        Guid id,
        UpdateNotificationMessageRequest request,
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

        return entity.ToResponse();
    }

    [McpServerTool(Name = "notifications_delete_message", Destructive = true)]
    [Authorize(Policy = StarterKitPermissions.Notifications.Send)]
    [Description("Deletes a notification message.")]
    public async Task DeleteMessageAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await notificationMessageService.DeleteAsync(id, cancellationToken);
    }

    [McpServerTool(Name = "notifications_send_message")]
    [Authorize(Policy = StarterKitPermissions.Notifications.Send)]
    [Description(
        "Sends a notification message to its configured recipients. Optionally accepts base64 file attachments to include with the email. The notification is queued for background delivery and returns immediately."
    )]
    public async Task<NotificationMessageResponse> SendMessageAsync(
        Guid id,
        [Description("Optional attachments to include with the email.")]
            SendNotificationRequest? request = null,
        CancellationToken cancellationToken = default
    )
    {
        var entity = await notificationMessageService.SendAsync(
            id,
            request?.Attachments.ToEmailAttachments(),
            cancellationToken
        );
        return entity.ToResponse();
    }
}
