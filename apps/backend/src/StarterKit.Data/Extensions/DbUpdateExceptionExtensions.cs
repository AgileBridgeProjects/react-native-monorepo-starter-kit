using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace StarterKit.Data.Extensions;

public static class DbUpdateExceptionExtensions
{
    // PostgreSQL SQLSTATE for a unique-constraint / unique-index violation.
    private const string UniqueViolationSqlState = "23505";

    /// <summary>
    /// Returns <c>true</c> when the inner <see cref="PostgresException"/> has SQLSTATE 23505
    /// (unique violation). Use this to distinguish a duplicate-key race from other
    /// <see cref="DbUpdateException"/> causes.
    /// </summary>
    public static bool IsUniqueConstraintViolation(this DbUpdateException exception)
    {
        return exception.InnerException is PostgresException { SqlState: UniqueViolationSqlState };
    }

    /// <summary>
    /// Returns <c>true</c> when the inner <see cref="PostgresException"/> is a unique constraint
    /// violation (SQLSTATE 23505) and the constraint name or error message contains
    /// <paramref name="indexName"/>. Use this to target a specific named index.
    /// </summary>
    public static bool IsUniqueConstraintViolation(
        this DbUpdateException exception,
        string indexName
    )
    {
        return exception.InnerException
                is PostgresException { SqlState: UniqueViolationSqlState } pgEx
            && (
                (
                    pgEx.ConstraintName?.Contains(indexName, StringComparison.OrdinalIgnoreCase)
                    ?? false
                ) || pgEx.Message.Contains(indexName, StringComparison.OrdinalIgnoreCase)
            );
    }
}
