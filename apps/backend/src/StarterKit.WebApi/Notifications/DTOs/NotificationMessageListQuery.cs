using System.ComponentModel.DataAnnotations;
using StarterKit.Core.Common;
using StarterKit.Data.Notifications.Enums;

namespace StarterKit.WebApi.Notifications.DTOs;

public sealed class NotificationMessageListQuery : PagedAndFilteredQuery
{
    [Required]
    public Guid ClubId { get; init; }

    public NotificationStatus? Status { get; init; }

    public MessageChannel? Channel { get; init; }
}
