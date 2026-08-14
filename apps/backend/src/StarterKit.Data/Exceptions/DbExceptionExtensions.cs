using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace StarterKit.Data.Exceptions;

/// <summary>
/// Extension helpers for detecting structured database exceptions.
/// </summary>
public static class DbExceptionExtensions
{
    // PostgreSQL SQLSTATE for a unique-constraint / unique-index violation.
    private const string UniqueViolationSqlState = "23505";

    /// <summary>
    /// Returns <see langword="true"/> when <paramref name="ex"/> was caused by a unique-index
    /// violation on <paramref name="constraintName"/>.
    /// </summary>
    /// <remarks>
    /// Checks the Npgsql <see cref="PostgresException.SqlState"/> for SQLSTATE 23505 first
    /// (structured, provider-stable). Falls back to a case-insensitive substring match on the
    /// inner-exception message for non-PostgreSQL providers (e.g. SQLite/InMemory in unit tests).
    /// </remarks>
    public static bool IsUniqueConstraintViolation(this DbUpdateException ex, string constraintName)
    {
        if (ex.InnerException is PostgresException pgEx)
            return pgEx.SqlState == UniqueViolationSqlState
                && (
                    (
                        pgEx.ConstraintName?.Contains(
                            constraintName,
                            StringComparison.OrdinalIgnoreCase
                        ) ?? false
                    ) || pgEx.Message.Contains(constraintName, StringComparison.OrdinalIgnoreCase)
                );

        // Fallback for SQLite / InMemory providers used in tests.
        return ex.InnerException?.Message.Contains(
                constraintName,
                StringComparison.OrdinalIgnoreCase
            ) == true;
    }
}
