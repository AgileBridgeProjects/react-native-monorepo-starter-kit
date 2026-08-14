namespace StarterKit.Core.Notifications.Enums;

[Flags]
public enum NotificationChannel
{
    None = 0,
    Email = 1,
    Sms = 2,
    InApp = 4,
    All = Email | Sms,
}
