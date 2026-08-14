using Microsoft.EntityFrameworkCore;
using StarterKit.Data.Clubs.Interfaces.Repositories;
using StarterKit.Data.Clubs.Models;
using StarterKit.Data.Extensions;
using StarterKit.Data.Persistence;

namespace StarterKit.Data.Clubs.Repositories;

public class ClubRepository : IClubRepository
{
    private readonly AppDbContext _dbContext;

    public ClubRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(Club club, CancellationToken cancellationToken = default)
    {
        await _dbContext.Clubs.AddAsync(club, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<Club?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Clubs.FindAsync([id], cancellationToken);
    }

    public async Task<Club?> FindByNameAsync(
        string name,
        CancellationToken cancellationToken = default
    )
    {
        return await _dbContext.Clubs.FirstOrDefaultAsync(c => c.Name == name, cancellationToken);
    }

    public async Task<Club> GetAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Clubs.GetAsync(id, cancellationToken);
    }

    public async Task UpdateAsync(Club club, CancellationToken cancellationToken = default)
    {
        _dbContext.Clubs.Update(club);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var club = await _dbContext.Clubs.GetAsync(id, cancellationToken);
        _dbContext.Clubs.Remove(club);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<(IReadOnlyList<ClubWithCounts> Items, int TotalCount)> ListAsync(
        int page,
        int pageSize,
        string? filterText = null,
        string? sortBy = null,
        bool sortDescending = false,
        CancellationToken cancellationToken = default
    )
    {
        var query = _dbContext.Clubs.AsNoTracking().AsQueryable();

        query = query.WhereIf(
            !string.IsNullOrWhiteSpace(filterText),
            c =>
                c.Name.Contains(filterText!)
                || c.StreetAddress.Contains(filterText!)
                || c.City.Contains(filterText!)
        );

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .ApplySorting(sortBy, sortDescending, defaultSort: "Name")
            // Deterministic paging: without a unique tiebreaker, rows sharing a sort value can
            // swap pages between requests.
            .ThenBy(c => c.Id)
            .ApplyPaging(page, pageSize)
            .Select(c => new ClubWithCounts
            {
                Club = c,
                ActiveUserCount = _dbContext.Users.Count(u => u.ClubId == c.Id && u.IsActive),
                TeamCount = _dbContext.Teams.Count(d => d.Season.ClubId == c.Id),
            })
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }
}
