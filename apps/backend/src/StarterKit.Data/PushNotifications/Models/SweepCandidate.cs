namespace StarterKit.Data.PushNotifications.Models;

/// <summary>Projection used by the sweep job — avoids loading the full entity graph.</summary>
public sealed record SweepCandidate(
    Guid NotificationId,
    Guid UserId,
    string NotificationType,
    string Title,
    string Body
);
