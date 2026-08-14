using Hangfire;
using Microsoft.Extensions.Options;
using StarterKit.Core.Common;
using StarterKit.Core.Notifications.DTOs;
using StarterKit.Core.Notifications.Interfaces.Services;
using StarterKit.Core.Resources;
using StarterKit.Core.Storage;
using StarterKit.Core.Storage.Interfaces;
using StarterKit.Data.Notifications.Enums;
using StarterKit.Data.Notifications.Interfaces.Repositories;
using StarterKit.Data.Notifications.Models;

namespace StarterKit.Core.Notifications.Services;

public sealed class NotificationMessageService(
    INotificationMessageRepository repository,
    IBackgroundJobClient backgroundJobClient,
    IBlobStorageService blobStorageService,
    IOptions<MediaUploadOptions> mediaUploadOptions,
    TimeProvider clock
) : INotificationMessageService
{
    private readonly MediaUploadOptions _mediaOptions = mediaUploadOptions.Value;

    public async Task<NotificationMessage> CreateAsync(
        string? subject,
        string message,
        MessageChannel channel,
        Guid clubId,
        Guid? teamId,
        IReadOnlyList<AttachmentInput>? attachments = null,
        AttachmentInput? mediaAttachment = null,
        CancellationToken cancellationToken = default
    )
    {
        var storedAttachments = attachments is { Count: > 0 }
            ? await UploadAttachmentsAsync(attachments, cancellationToken)
            : new List<StoredAttachment>();

        var mediaUrl = mediaAttachment is not null
            ? await UploadMediaAttachmentAsync(mediaAttachment, cancellationToken)
            : (string?)null;

        var entity = new NotificationMessage
        {
            Subject = subject ?? string.Empty,
            Message = message,
            Channel = channel,
            ClubId = clubId,
            TeamId = teamId,
            Attachments = storedAttachments,
            MediaUrl = mediaUrl,
            Status = NotificationStatus.Draft,
        };

        await repository.AddAsync(entity, cancellationToken);
        return entity;
    }

    public async Task<NotificationMessage> GetAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        return await repository.GetAsync(id, cancellationToken);
    }

    public async Task<PagedResult<NotificationMessage>> ListAsync(
        Guid clubId,
        int page,
        int pageSize,
        NotificationStatus? status = null,
        MessageChannel? channel = null,
        string? filterText = null,
        string? sortBy = null,
        bool sortDescending = false,
        CancellationToken cancellationToken = default
    )
    {
        var (items, totalCount) = await repository.ListAsync(
            clubId,
            page,
            pageSize,
            status,
            channel,
            filterText,
            sortBy,
            sortDescending,
            cancellationToken
        );

        return new PagedResult<NotificationMessage>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
        };
    }

    public async Task<NotificationMessage> UpdateAsync(
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
    )
    {
        var entity = await repository.GetAsync(id, cancellationToken);

        if (entity.Status == NotificationStatus.Sent)
            throw new InvalidOperationException(
                "Cannot edit a notification that has already been sent."
            );

        entity.Subject = subject ?? string.Empty;
        entity.Message = message;
        entity.Channel = channel;
        entity.ClubId = clubId;
        entity.TeamId = teamId;

        if (mediaAttachment is not null)
        {
            var oldMediaUrl = entity.MediaUrl;
            entity.MediaUrl = await UploadMediaAttachmentAsync(mediaAttachment, cancellationToken);
            if (oldMediaUrl is not null)
                await blobStorageService.DeleteAsync(oldMediaUrl, cancellationToken);
        }
        else if (clearMedia && entity.MediaUrl is not null)
        {
            await blobStorageService.DeleteAsync(entity.MediaUrl, cancellationToken);
            entity.MediaUrl = null;
        }

        if (attachments is not null)
        {
            entity.Attachments =
                attachments.Count > 0
                    ? await UploadAttachmentsAsync(attachments, cancellationToken)
                    : [];
        }

        await repository.UpdateAsync(entity, cancellationToken);
        return entity;
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await repository.DeleteAsync(id, cancellationToken);
    }

    public async Task<NotificationMessage> SendAsync(
        Guid id,
        IReadOnlyList<EmailAttachment>? attachments = null,
        CancellationToken cancellationToken = default
    )
    {
        var entity = await repository.GetAsync(id, cancellationToken);

        if (entity.Status is NotificationStatus.Sending or NotificationStatus.Sent)
            throw new InvalidOperationException(
                "Cannot send a notification that is already sending or has been sent."
            );

        // If runtime attachments are provided, upload them to blob so the background job can access them
        if (attachments is { Count: > 0 })
        {
            var inputs = attachments
                .Select(a => new AttachmentInput(a.FileName, a.ContentType, a.ContentBase64))
                .ToList();
            entity.Attachments = await UploadAttachmentsAsync(inputs, cancellationToken);
        }

        entity.Status = NotificationStatus.Sending;
        await repository.UpdateAsync(entity, cancellationToken);

        var hangfireId = backgroundJobClient.Enqueue<ICommunicationsJobProcessor>(p =>
            p.ProcessAsync(entity.Id, JobCancellationToken.Null)
        );

        entity.BackgroundJobId = hangfireId;
        await repository.UpdateAsync(entity, cancellationToken);

        return entity;
    }

    private async Task<string> UploadMediaAttachmentAsync(
        AttachmentInput input,
        CancellationToken cancellationToken
    )
    {
        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(input.ContentBase64);
        }
        catch (FormatException)
        {
            throw new ArgumentException(
                "Media attachment contains invalid base64 data.",
                nameof(input)
            );
        }

        FileUploadValidator.Validate(
            new UploadedFile(input.FileName, input.ContentType, bytes.Length, Stream.Null),
            _mediaOptions.AllowedContentTypes,
            _mediaOptions.MaxFileSizeBytes,
            nameof(input)
        );

        using var stream = new MemoryStream(bytes);
        var file = new UploadedFile(input.FileName, input.ContentType, bytes.Length, stream);
        var uploadResult = await blobStorageService.UploadAsync(
            BlobContainerName.CommunicationAttachments,
            file,
            cancellationToken
        );
        return uploadResult.StoredPath;
    }

    private async Task<List<StoredAttachment>> UploadAttachmentsAsync(
        IReadOnlyList<AttachmentInput> inputs,
        CancellationToken cancellationToken
    )
    {
        var results = new List<StoredAttachment>(inputs.Count);
        foreach (var input in inputs)
        {
            var bytes = Convert.FromBase64String(input.ContentBase64);
            using var stream = new MemoryStream(bytes);
            var file = new UploadedFile(input.FileName, input.ContentType, bytes.Length, stream);
            var uploadResult = await blobStorageService.UploadAsync(
                BlobContainerName.CommunicationAttachments,
                file,
                cancellationToken
            );
            results.Add(
                new StoredAttachment(input.FileName, input.ContentType, uploadResult.StoredPath)
            );
        }
        return results;
    }
}
