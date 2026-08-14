using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using ModelContextProtocol.Server;
using StarterKit.Core.Interfaces;
using StarterKit.Core.Storage.Interfaces;
using StarterKit.Data.Exceptions;
using StarterKit.Data.PushNotifications.Interfaces.Repositories;
using StarterKit.MobileApi.PushNotifications.DTOs;
using StarterKit.MobileApi.PushNotifications.Mappers;

namespace StarterKit.MobileApi.PushNotifications.Mcp;

/// <summary>
/// MCP tools mirroring <see cref="PushNotificationsController"/> 1:1.
/// Injects the repository directly to match the controller's baselined debt
/// (see the thin-controller baseline entry in scripts/check-architecture.mjs).
/// </summary>
[McpServerToolType]
public sealed class PushNotificationsMcpTools(
    IPushNotificationRepository repository,
    ICurrentSession session,
    IBlobStorageService blobStorageService
)
{
    [McpServerTool(Name = "push_notifications_list", ReadOnly = true)]
    [Authorize]
    [Description("Returns a paginated list of push notifications for the current user.")]
    public async Task<PushNotificationListResponse> ListAsync(
        [Description("1-based page number.")] int page = 1,
        [Description("Items per page.")] int pageSize = 20,
        CancellationToken cancellationToken = default
    )
    {
        var (items, totalCount, unreadCount) = await repository.ListAsync(
            session.UserId,
            page,
            pageSize,
            cancellationToken
        );

        return new PushNotificationListResponse
        {
            Items = items.Select(n => n.ToResponse()).ToList(),
            TotalCount = totalCount,
            UnreadCount = unreadCount,
            Page = page,
            PageSize = pageSize,
        };
    }

    [McpServerTool(Name = "push_notifications_get_by_id", ReadOnly = true)]
    [Authorize]
    [Description("Returns the full detail of a single notification for the current user.")]
    public async Task<PushNotificationResponse> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var notification = await repository.FindByIdAsync(id, cancellationToken);
        if (notification is null || notification.UserId != session.UserId)
            throw new EntityNotFoundException("PushNotification", id);

        return notification.ToDetailResponse(
            await blobStorageService.ResolveStoredPathAsync(
                notification.MediaUrl,
                cancellationToken
            )
        );
    }

    [McpServerTool(Name = "push_notifications_mark_read", Idempotent = true)]
    [Authorize]
    [Description("Marks a single notification as read for the current user.")]
    public async Task MarkReadAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var notification = await repository.FindByIdAsync(id, cancellationToken);
        if (notification is null || notification.UserId != session.UserId)
            throw new EntityNotFoundException("PushNotification", id);

        await repository.MarkReadAsync(id, session.UserId, cancellationToken);
    }

    [McpServerTool(Name = "push_notifications_mark_all_read", Idempotent = true)]
    [Authorize]
    [Description("Marks all notifications as read for the current user.")]
    public async Task MarkAllReadAsync(CancellationToken cancellationToken = default)
    {
        await repository.MarkAllReadAsync(session.UserId, cancellationToken);
    }

    [McpServerTool(Name = "push_notifications_mark_seen", Idempotent = true)]
    [Authorize]
    [Description("Marks a notification as seen (the user viewed it in the list).")]
    public async Task MarkSeenAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var notification = await repository.FindByIdAsync(id, cancellationToken);
        if (notification is null || notification.UserId != session.UserId)
            throw new EntityNotFoundException("PushNotification", id);

        await repository.MarkSeenAsync(id, session.UserId, cancellationToken);
    }
}
