using StarterKit.Data.Notifications.Enums;
using StarterKit.Data.Notifications.Models;

namespace StarterKit.Data.Notifications.Interfaces.Repositories;

public interface INotificationMessageRepository
{
    Task AddAsync(NotificationMessage message, CancellationToken cancellationToken = default);
    Task<NotificationMessage?> FindByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default
    );
    Task<NotificationMessage> GetAsync(Guid id, CancellationToken cancellationToken = default);
    Task UpdateAsync(NotificationMessage message, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<NotificationMessage> Items, int TotalCount)> ListAsync(
        Guid clubId,
        int page,
        int pageSize,
        NotificationStatus? status = null,
        MessageChannel? channel = null,
        string? filterText = null,
        string? sortBy = null,
        bool sortDescending = false,
        CancellationToken cancellationToken = default
    );
}
