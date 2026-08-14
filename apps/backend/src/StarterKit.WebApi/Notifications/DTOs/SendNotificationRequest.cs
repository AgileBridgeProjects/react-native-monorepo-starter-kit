namespace StarterKit.WebApi.Notifications.DTOs;

/// <summary>Optional body for sending a notification message with attachments.</summary>
public sealed record SendNotificationRequest(IReadOnlyList<AttachmentRequest>? Attachments = null);
