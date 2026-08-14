using Microsoft.EntityFrameworkCore;
using StarterKit.Data.Extensions;
using StarterKit.Data.Persistence;
using StarterKit.Data.Resources.Interfaces.Repositories;
using StarterKit.Data.Resources.Models;

namespace StarterKit.Data.Resources.Repositories;

public class ResourceRepository : IResourceRepository
{
    private readonly AppDbContext _dbContext;

    public ResourceRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(Resource resource, CancellationToken cancellationToken = default)
    {
        await _dbContext.Resources.AddAsync(resource, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<Resource?> FindByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        return await _dbContext.Resources.FindAsync([id], cancellationToken);
    }

    public async Task<Resource> GetAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Resources.GetAsync(id, cancellationToken);
    }

    public async Task UpdateAsync(Resource resource, CancellationToken cancellationToken = default)
    {
        _dbContext.Resources.Update(resource);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var resource = await _dbContext.Resources.GetAsync(id, cancellationToken);
        _dbContext.Resources.Remove(resource);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<(IReadOnlyList<Resource> Items, int TotalCount)> ListAsync(
        int page,
        int pageSize,
        string? filterText = null,
        CancellationToken cancellationToken = default
    )
    {
        var query = _dbContext.Resources.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(filterText))
            query = query.Where(r => r.Title.Contains(filterText));

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(r => r.Title)
            .ApplyPaging(page, pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }
}
