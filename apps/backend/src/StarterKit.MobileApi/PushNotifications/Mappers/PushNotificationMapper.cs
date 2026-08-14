using Riok.Mapperly.Abstractions;
using StarterKit.Data.PushNotifications.Models;
using StarterKit.MobileApi.PushNotifications.DTOs;

namespace StarterKit.MobileApi.PushNotifications.Mappers;

[Mapper]
public static partial class PushNotificationMapper
{
    /// <summary>
    /// Maps a <see cref="PushNotification"/> entity to a <see cref="PushNotificationResponse"/>.
    /// <c>MediaUrl</c> is copied as-is; callers that need a resolved SAS URL must
    /// override the property after mapping (see <see cref="ToDetailResponse"/>).
    /// </summary>
    public static partial PushNotificationResponse ToResponse(this PushNotification notification);

    [MapperIgnoreTarget(nameof(PushNotificationResponse.MediaUrl))]
    private static partial PushNotificationResponse ToResponseWithoutMedia(
        this PushNotification notification
    );

    /// <summary>
    /// Maps a notification and injects a pre-resolved <paramref name="mediaUrl"/>
    /// (e.g. a SAS URL). Used by <c>GetByIdAsync</c> where the URL must be resolved
    /// asynchronously before mapping.
    /// </summary>
    public static PushNotificationResponse ToDetailResponse(
        this PushNotification notification,
        string? mediaUrl
    )
    {
        var response = notification.ToResponseWithoutMedia();
        response.MediaUrl = mediaUrl;
        return response;
    }
}
