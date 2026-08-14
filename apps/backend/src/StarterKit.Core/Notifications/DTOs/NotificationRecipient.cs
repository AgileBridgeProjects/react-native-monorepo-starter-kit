namespace StarterKit.Core.Notifications.DTOs;

/// <summary>
/// The target of a notification send. Either field may be null —
/// the dispatcher silently skips a channel when the corresponding field is absent.
/// </summary>
public sealed record NotificationRecipient(string? Email, string? PhoneNumber);
