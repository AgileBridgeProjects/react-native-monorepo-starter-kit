namespace StarterKit.Data.Interfaces;

/// <summary>
/// Wraps EF Core's <c>CreateExecutionStrategy</c> so that callers can open a retriable
/// transaction without taking a direct dependency on <see cref="Microsoft.EntityFrameworkCore"/>.
/// </summary>
public interface IDbExecutionStrategy
{
    /// <summary>
    /// Executes <paramref name="operation"/> inside a database transaction, wrapped in the
    /// configured EF Core execution strategy so that the entire unit (transaction + commit)
    /// is retried on transient SQL failures.
    /// </summary>
    Task ExecuteInTransactionAsync(Func<Task> operation);
}
