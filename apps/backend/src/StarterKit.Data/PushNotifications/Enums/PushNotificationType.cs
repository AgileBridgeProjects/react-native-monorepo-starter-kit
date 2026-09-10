namespace StarterKit.Data.PushNotifications.Enums;

/// <summary>
/// The kinds of push notification this app sends. Add your own; the set below is deliberately
/// small and exists to show the two delivery modes the notification pipeline supports.
/// See docs/standards/notifications.md § Inbox policy for which mode a new type should use.
/// </summary>
public enum PushNotificationType
{
    /// <summary>Something was published that the user should come back for. INBOX.</summary>
    NewContent,

    /// <summary>A message from an administrator. INBOX.</summary>
    AdminMessage,

    /// <summary>
    /// A chat message was sent to a conversation the user belongs to.
    /// <para>
    /// TRANSIENT — delivered via <c>DeliverTransientAsync</c>, so no PushNotification inbox
    /// row is written. One row per chat message would swamp the notification drawer (see the
    /// inbox policy in docs/standards/notifications.md).
    /// </para>
    /// </summary>
    NewMessage,

    /// <summary>
    /// A periodic nudge to re-engage. TRANSIENT — stale the moment the period rolls over, so
    /// an inbox row would outlive its own relevance.
    /// </summary>
    WeeklyNudge,
}
