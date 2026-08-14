using Microsoft.EntityFrameworkCore;
using StarterKit.Data.Interfaces;
using StarterKit.Data.Persistence;

namespace StarterKit.Data.Infrastructure;

/// <summary>
/// Implements <see cref="IDbExecutionStrategy"/> using the EF Core execution strategy
/// configured on <see cref="AppDbContext"/> (e.g. <c>SqlServerRetryingExecutionStrategy</c>).
/// The strategy wraps both the operation and the <c>COMMIT</c> so transient failures on
/// either are retried from scratch.
/// </summary>
internal sealed class DbExecutionStrategy(AppDbContext dbContext) : IDbExecutionStrategy
{
    public Task ExecuteInTransactionAsync(Func<Task> operation) =>
        dbContext
            .Database.CreateExecutionStrategy()
            .ExecuteAsync(async () =>
            {
                await using var tx = await dbContext.Database.BeginTransactionAsync();
                try
                {
                    await operation();
                    await tx.CommitAsync();
                }
                catch
                {
                    await tx.RollbackAsync();
                    throw;
                }
            });
}
