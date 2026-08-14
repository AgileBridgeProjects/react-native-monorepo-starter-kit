using Microsoft.EntityFrameworkCore;
using StarterKit.Data.Extensions;
using StarterKit.Data.Persistence;
using StarterKit.Data.Seasons.Interfaces.Repositories;
using StarterKit.Data.Seasons.Models;

namespace StarterKit.Data.Seasons.Repositories;

public class SeasonRepository(AppDbContext dbContext) : ISeasonRepository
{
    public async Task AddAsync(Season season, CancellationToken cancellationToken = default)
    {
        await dbContext.Seasons.AddAsync(season, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<Season?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await dbContext.Seasons.FindAsync([id], cancellationToken);
    }

    public async Task<Season> GetAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await dbContext.Seasons.GetAsync(id, cancellationToken);
    }

    public async Task<Season?> FindCurrentAsync(
        Guid clubId,
        DateOnly date,
        CancellationToken cancellationToken = default
    )
    {
        return await dbContext
            .Seasons.AsNoTracking()
            .Where(x => x.ClubId == clubId && x.StartDate <= date && x.EndDate >= date)
            .OrderByDescending(x => x.StartDate)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Season>> ListByClubAsync(
        Guid clubId,
        CancellationToken cancellationToken = default
    )
    {
        return await dbContext
            .Seasons.AsNoTracking()
            .Where(x => x.ClubId == clubId)
            .OrderByDescending(x => x.StartDate)
            .ToListAsync(cancellationToken);
    }
}
