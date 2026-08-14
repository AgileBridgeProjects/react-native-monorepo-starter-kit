using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StarterKit.Core.Interfaces;
using StarterKit.Core.Storage.Interfaces;
using StarterKit.Data.PushNotifications.Interfaces.Repositories;
using StarterKit.MobileApi.PushNotifications.DTOs;
using StarterKit.MobileApi.PushNotifications.Mappers;

namespace StarterKit.MobileApi.PushNotifications;

[ApiController]
[Route("api/push-notifications")]
[Tags("PushNotifications")]
[Authorize]
public sealed class PushNotificationsController(
    IPushNotificationRepository repository,
    ICurrentSession session,
    IBlobStorageService blobStorageService
) : ControllerBase
{
    /// <summary>
    /// Returns a paginated list of push notifications for the current user.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(PushNotificationListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<PushNotificationListResponse>> ListAsync(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default
    )
    {
        var (items, totalCount, unreadCount) = await repository.ListAsync(
            session.UserId,
            page,
            pageSize,
            cancellationToken
        );

        return Ok(
            new PushNotificationListResponse
            {
                Items = items.Select(n => n.ToResponse()).ToList(),
                TotalCount = totalCount,
                UnreadCount = unreadCount,
                Page = page,
                PageSize = pageSize,
            }
        );
    }

    /// <summary>Returns the full detail of a single notification for the current user.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(PushNotificationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PushNotificationResponse>> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var notification = await repository.FindByIdAsync(id, cancellationToken);
        if (notification is null || notification.UserId != session.UserId)
            return NotFound();

        return Ok(
            notification.ToDetailResponse(
                await blobStorageService.ResolveStoredPathAsync(
                    notification.MediaUrl,
                    cancellationToken
                )
            )
        );
    }

    /// <summary>Marks a single notification as read.</summary>
    [HttpPatch("{id:guid}/read")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> MarkReadAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var notification = await repository.FindByIdAsync(id, cancellationToken);
        if (notification is null || notification.UserId != session.UserId)
            return NotFound();

        await repository.MarkReadAsync(id, session.UserId, cancellationToken);
        return NoContent();
    }

    /// <summary>Marks all notifications as read for the current user.</summary>
    [HttpPatch("read-all")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> MarkAllReadAsync(CancellationToken cancellationToken = default)
    {
        await repository.MarkAllReadAsync(session.UserId, cancellationToken);
        return NoContent();
    }

    /// <summary>Marks a notification as seen (user viewed it in the list).</summary>
    [HttpPatch("{id:guid}/seen")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> MarkSeenAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var notification = await repository.FindByIdAsync(id, cancellationToken);
        if (notification is null || notification.UserId != session.UserId)
            return NotFound();

        await repository.MarkSeenAsync(id, session.UserId, cancellationToken);
        return NoContent();
    }
}
