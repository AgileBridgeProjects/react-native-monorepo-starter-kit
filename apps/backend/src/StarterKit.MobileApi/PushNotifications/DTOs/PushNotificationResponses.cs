namespace StarterKit.MobileApi.PushNotifications.DTOs;

public sealed class PushNotificationResponse
{
    public Guid Id { get; set; }
    public string NotificationType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime? SeenAt { get; set; }
    public DateTime? PushSentAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? MediaUrl { get; set; }
}

public sealed class PushNotificationListResponse
{
    public IReadOnlyList<PushNotificationResponse> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int UnreadCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
