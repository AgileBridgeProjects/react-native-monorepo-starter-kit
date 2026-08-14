namespace StarterKit.WebApi.Notifications.DTOs;

public sealed record NotificationMessageListResponse
{
    public required IReadOnlyList<NotificationMessageResponse> Items { get; init; }
    public required int TotalCount { get; init; }
    public required int Page { get; init; }
    public required int PageSize { get; init; }
    public required bool HasNextPage { get; init; }
}
