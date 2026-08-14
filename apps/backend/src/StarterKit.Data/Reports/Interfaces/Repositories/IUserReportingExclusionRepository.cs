using StarterKit.Data.Reports.Models;

namespace StarterKit.Data.Reports.Interfaces.Repositories;

public interface IUserReportingExclusionRepository
{
    Task<IReadOnlyList<UserReportingExclusion>> GetAllAsync(
        CancellationToken cancellationToken = default
    );

    Task<IReadOnlyList<ExclusionRow>> GetAllWithDisplayNamesAsync(
        CancellationToken cancellationToken = default
    );

    Task<UserReportingExclusion?> FindByUserIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    );

    Task<bool> IsExcludedAsync(Guid userId, CancellationToken cancellationToken = default);

    Task AddAsync(UserReportingExclusion exclusion, CancellationToken cancellationToken = default);

    Task DeleteByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
}
