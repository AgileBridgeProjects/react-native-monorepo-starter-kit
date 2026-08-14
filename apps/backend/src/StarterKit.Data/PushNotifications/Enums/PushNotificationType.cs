namespace StarterKit.Data.PushNotifications.Enums;

public enum PushNotificationType
{
    NewContent,
    NewGame,
    RewardUnlocked,
    WeeklyNudge,
    AdminMessage,

    /// <summary>Afternoon reminder to play today while the weekly target is still unmet.</summary>
    DailyPlayReminder,

    /// <summary>Week-end warning that an active weekly streak is about to be lost.</summary>
    StreakAtRisk,

    /// <summary>
    /// A chat message was sent to a conversation the user belongs to.
    /// <para>
    /// TRANSIENT — delivered via <c>DeliverTransientAsync</c>, so no PushNotification inbox
    /// row is written. One row per chat message would swamp the notification drawer (see the
    /// inbox policy in docs/standards/notifications.md). AC 9.4's "persistent record" is the
    /// Message row plus <c>UserConversation.LastReadAt</c>: the message still surfaces in the
    /// Messages list with an unread badge when both live paths are missed.
    /// </para>
    /// </summary>
    NewMessage,

    /// <summary>
    /// The the identity split distress-language scan flagged an athlete's journal entry. Delivered to the
    /// athlete's Coach, Parent(s), and Director — never to the athlete themselves. Title/body are
    /// intentionally generic (no snippet, severity, or athlete name) since push payloads can
    /// surface on a lock screen.
    /// </summary>
    JournalAlert,

    /// <summary>
    /// A user's selected check-in reminder slot (Morning/Afternoon/Evening) has opened and they
    /// have not yet submitted a check-in for it. TRANSIENT — delivered via
    /// <c>DeliverTransientAsync</c>; stale the moment the slot's window closes, same rationale as
    /// <see cref="DailyPlayReminder"/>.
    /// </summary>
    CheckInReminder,

    /// <summary>
    /// An athlete submitted a Survey or Homework assignment. Delivered to every
    /// Coach/Director who shares a team with the athlete via <c>INotificationBroadcaster.BroadcastAsync</c>
    /// only — no inbox row, no OS push, same as <see cref="NewMessage"/>'s live-signal-only path.
    /// The client uses this purely to invalidate the Create space's template/roster queries so the
    /// completion progress bar updates without a manual refresh.
    /// </summary>
    ReflectionAssignmentCompleted,

    /// <summary>
    /// A calendar event's start time changed and the recipient's existing RSVP was soft-deleted
    /// as a result — they need to RSVP again. INBOX — delivered via
    /// <c>CreateAndDeliverAsync</c> (through <c>IContentAssignedDispatchJob</c>): unlike a
    /// reminder nudge this represents an action the user still needs to take, so it belongs in
    /// the notification drawer until they act on it.
    /// </summary>
    CalendarEventRsvpResetRequired,
}
