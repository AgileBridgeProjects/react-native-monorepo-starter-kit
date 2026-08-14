using StarterKit.Core.Common;
using StarterKit.Core.Notifications.DTOs;
using StarterKit.Data.Notifications.Enums;
using StarterKit.Data.Notifications.Models;

namespace StarterKit.Core.Notifications.Interfaces.Services;

public interface INotificationMessageService
{
    Task<NotificationMessage> CreateAsync(
        string? subject,
        string message,
        MessageChannel channel,
        Guid clubId,
        Guid? teamId,
        IReadOnlyList<AttachmentInput>? attachments = null,
        AttachmentInput? mediaAttachment = null,
        CancellationToken cancellationToken = default
    );

    Task<NotificationMessage> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<PagedResult<NotificationMessage>> ListAsync(
        Guid clubId,
        int page,
        int pageSize,
        NotificationStatus? status = null,
        MessageChannel? channel = null,
        string? filterText = null,
        string? sortBy = null,
        bool sortDescending = false,
        CancellationToken cancellationToken = default
    );

    Task<NotificationMessage> UpdateAsync(
        Guid id,
        string? subject,
        string message,
        MessageChannel channel,
        Guid clubId,
        Guid? teamId,
        IReadOnlyList<AttachmentInput>? attachments = null,
        AttachmentInput? mediaAttachment = null,
        bool clearMedia = false,
        CancellationToken cancellationToken = default
    );

    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);

    Task<NotificationMessage> SendAsync(
        Guid id,
        IReadOnlyList<EmailAttachment>? attachments = null,
        CancellationToken cancellationToken = default
    );
}
