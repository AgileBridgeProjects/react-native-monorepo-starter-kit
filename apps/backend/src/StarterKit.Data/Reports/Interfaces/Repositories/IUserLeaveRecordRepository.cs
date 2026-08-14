using StarterKit.Data.Reports.Models;

namespace StarterKit.Data.Reports.Interfaces.Repositories;

public interface IUserLeaveRecordRepository
{
    /// <summary>All leave records for the club, newest first, projected with player names.</summary>
    Task<IReadOnlyList<LeaveRecordRow>> GetAllWithDisplayNamesAsync(
        Guid clubId,
        CancellationToken cancellationToken = default
    );

    Task AddAsync(UserLeaveRecord record, CancellationToken cancellationToken = default);

    Task DeleteByIdAsync(Guid id, Guid clubId, CancellationToken cancellationToken = default);

    /// <summary>
    /// User IDs on leave on <paramref name="date" /> (date within [StartDate, EndDate]). Used by
    /// the snapshot refresh job to exclude on-leave players from that day's aggregates.
    /// </summary>
    Task<IReadOnlyList<Guid>> GetUserIdsOnLeaveForDateAsync(
        DateOnly date,
        CancellationToken cancellationToken = default
    );
}
