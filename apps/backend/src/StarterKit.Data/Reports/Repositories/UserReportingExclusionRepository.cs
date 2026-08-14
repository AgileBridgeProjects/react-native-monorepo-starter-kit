using Microsoft.EntityFrameworkCore;
using StarterKit.Data.Exceptions;
using StarterKit.Data.Persistence;
using StarterKit.Data.Reports.Interfaces.Repositories;
using StarterKit.Data.Reports.Models;

namespace StarterKit.Data.Reports.Repositories;

public sealed class UserReportingExclusionRepository : IUserReportingExclusionRepository
{
    private readonly AppDbContext _dbContext;

    public UserReportingExclusionRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<UserReportingExclusion>> GetAllAsync(
        CancellationToken cancellationToken = default
    )
    {
        return await _dbContext
            .UserReportingExclusions.AsNoTracking()
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ExclusionRow>> GetAllWithDisplayNamesAsync(
        CancellationToken cancellationToken = default
    )
    {
        return await (
            from e in _dbContext.UserReportingExclusions.AsNoTracking()
            join u in _dbContext.Users.AsNoTracking() on e.UserId equals u.Id
            select new ExclusionRow
            {
                UserId = e.UserId,
                DisplayName = u.DisplayName,
                Reason = e.Reason,
                CreatedAt = e.CreatedAt,
            }
        ).ToListAsync(cancellationToken);
    }

    public Task<UserReportingExclusion?> FindByUserIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    ) =>
        _dbContext
            .UserReportingExclusions.AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);

    public Task<bool> IsExcludedAsync(Guid userId, CancellationToken cancellationToken = default) =>
        _dbContext.UserReportingExclusions.AnyAsync(x => x.UserId == userId, cancellationToken);

    public async Task AddAsync(
        UserReportingExclusion exclusion,
        CancellationToken cancellationToken = default
    )
    {
        // Check for a previously soft-deleted row before inserting — a plain Add would violate
        // the unique (UserId, ClubId) index when re-excluding a user who was un-excluded.
        var existing = await _dbContext
            .UserReportingExclusions.IgnoreQueryFilters()
            .FirstOrDefaultAsync(
                x => x.UserId == exclusion.UserId && x.ClubId == exclusion.ClubId,
                cancellationToken
            );

        if (existing is not null)
        {
            existing.IsDeleted = false;
            existing.DeletedAt = null;
            existing.DeletedBy = null;
            existing.Reason = exclusion.Reason;
        }
        else
        {
            await _dbContext.UserReportingExclusions.AddAsync(exclusion, cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteByUserIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    )
    {
        var exclusion =
            await _dbContext.UserReportingExclusions.FirstOrDefaultAsync(
                x => x.UserId == userId,
                cancellationToken
            ) ?? throw new EntityNotFoundException(nameof(UserReportingExclusion), userId);

        exclusion.IsDeleted = true;
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
