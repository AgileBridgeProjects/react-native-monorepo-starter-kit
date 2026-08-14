using Microsoft.EntityFrameworkCore;
using StarterKit.Data.Exceptions;
using StarterKit.Data.Persistence;
using StarterKit.Data.Reports.Interfaces.Repositories;
using StarterKit.Data.Reports.Models;

namespace StarterKit.Data.Reports.Repositories;

public sealed class UserLeaveRecordRepository : IUserLeaveRecordRepository
{
    private readonly AppDbContext _dbContext;

    public UserLeaveRecordRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<LeaveRecordRow>> GetAllWithDisplayNamesAsync(
        Guid clubId,
        CancellationToken cancellationToken = default
    )
    {
        return await (
            from l in _dbContext.UserLeaveRecords.AsNoTracking()
            where l.ClubId == clubId
            join u in _dbContext.Users.AsNoTracking() on l.UserId equals u.Id
            orderby l.StartDate descending
            select new LeaveRecordRow
            {
                Id = l.Id,
                UserId = l.UserId,
                DisplayName = u.DisplayName,
                // A user can belong to more than one team via UserTeams — show the
                // alphabetically-first linked team name, same convention as
                // UserRepository.ApplyUserSorting's "team" sort.
                TeamName = u
                    .UserTeams.OrderBy(ut => ut.Team.Name)
                    .Select(ut => ut.Team.Name)
                    .FirstOrDefault(),
                StartDate = l.StartDate,
                EndDate = l.EndDate,
                Reason = l.Reason,
                CreatedAt = l.CreatedAt,
            }
        ).ToListAsync(cancellationToken);
    }

    public async Task AddAsync(
        UserLeaveRecord record,
        CancellationToken cancellationToken = default
    )
    {
        await _dbContext.UserLeaveRecords.AddAsync(record, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteByIdAsync(
        Guid id,
        Guid clubId,
        CancellationToken cancellationToken = default
    )
    {
        var record =
            await _dbContext.UserLeaveRecords.FirstOrDefaultAsync(
                x => x.Id == id && x.ClubId == clubId,
                cancellationToken
            ) ?? throw new EntityNotFoundException(nameof(UserLeaveRecord), id);

        // Soft delete via the AuditInterceptor.
        _dbContext.UserLeaveRecords.Remove(record);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Guid>> GetUserIdsOnLeaveForDateAsync(
        DateOnly date,
        CancellationToken cancellationToken = default
    )
    {
        return await _dbContext
            .UserLeaveRecords.IgnoreQueryFilters()
            .Where(l => !l.IsDeleted && l.StartDate <= date && l.EndDate >= date)
            .Select(l => l.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);
    }
}
