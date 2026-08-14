using StarterKit.Data.DeviceTokens.Enums;

namespace StarterKit.Core.PushNotifications.Interfaces;

/// <param name="EntityId">
/// Optional id of the thing the notification is about (the identity split AC 9.8: a message push carries
/// its conversation id). Rides in the push data payload so a tap can route straight to that
/// screen instead of dumping the user on a list to find it themselves. Never media — only the
/// identifier needed for routing.
/// </param>
public sealed record PushPayload(
    string Title,
    string Body,
    string? NotificationType = null,
    string? EntityId = null
);

public interface IPushSender
{
    PushPlatform Platform { get; }
    Task SendAsync(string deviceToken, PushPayload payload, CancellationToken ct = default);
}
