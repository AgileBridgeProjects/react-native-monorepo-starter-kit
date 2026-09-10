using StarterKit.Data.PushNotifications.Enums;

namespace StarterKit.Core.PushNotifications.Interfaces;

public interface IPushNotificationsService
{
    /// <summary>Creates a push notification DB row (appears in the notification drawer).</summary>
    Task<Guid> CreateAsync(
        Guid userId,
        PushNotificationType type,
        string title,
        string body,
        string? mediaUrl = null,
        CancellationToken ct = default
    );

    /// <summary>
    /// Creates a push notification DB row AND immediately delivers an OS-level push
    /// notification via Expo / HMS. Sets <c>PushSentAt</c> on success.
    /// Use for inbox notifications (AdminMessage, NewContent).
    /// </summary>
    Task CreateAndDeliverAsync(
        Guid userId,
        PushNotificationType type,
        string title,
        string body,
        string? mediaUrl = null,
        CancellationToken ct = default
    );

    /// <summary>
    /// Delivers an OS-level push notification WITHOUT writing a DB row.
    /// Use for time-bound nudges (WeeklyNudge, and anything else that goes stale on a clock)
    /// that are stale once the moment passes and would clutter the notification inbox.
    /// </summary>
    /// <param name="entityId">
    /// Optional id of the subject of the notification, forwarded in the push data payload for
    /// tap routing (e.g. the conversation a new message belongs to).
    /// </param>
    Task DeliverTransientAsync(
        Guid userId,
        PushNotificationType type,
        string title,
        string body,
        string? entityId = null,
        CancellationToken ct = default
    );

    /// <summary>
    /// Bulk variant of <see cref="DeliverTransientAsync"/> — fetches device tokens for the whole
    /// batch in one query instead of one query per user, then delivers each notification to its
    /// own recipient's token(s) (title/body can differ per entry). Use when dispatching to many
    /// users in the same tick (e.g. a recurring reminder job).
    /// </summary>
    Task DeliverTransientBulkAsync(
        IReadOnlyList<(Guid UserId, string Title, string Body)> notifications,
        PushNotificationType type,
        CancellationToken ct = default
    );
}
