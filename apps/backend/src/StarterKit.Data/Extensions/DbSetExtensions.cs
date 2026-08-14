using Microsoft.EntityFrameworkCore;
using StarterKit.Data.Exceptions;

namespace StarterKit.Data.Extensions;

internal static class DbSetExtensions
{
    /// <summary>
    /// Finds an entity by its <paramref name="id"/>.
    /// Throws <see cref="EntityNotFoundException"/> (a subtype of <see cref="InvalidOperationException"/>)
    /// when no matching row exists, so that the global <c>EntityNotFoundExceptionHandler</c>
    /// can translate it to an HTTP 404.
    /// </summary>
    public static async Task<T> GetAsync<T>(
        this DbSet<T> dbSet,
        Guid id,
        CancellationToken cancellationToken = default
    )
        where T : class
    {
        return await dbSet.FindAsync([id], cancellationToken)
            ?? throw new EntityNotFoundException(typeof(T).Name, id);
    }
}
