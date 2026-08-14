namespace StarterKit.Data.Auditing;

/// <summary>
/// Marks an entity for optimistic concurrency control via PostgreSQL's system
/// <c>xmin</c> column (mapped by Npgsql as a shadow concurrency token). A
/// <see cref="Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException"/> is
/// thrown when two concurrent updates target the same row, which is translated to
/// HTTP 409 by the global exception handler.
///
/// This is a marker interface — the concurrency token is the database-managed
/// <c>xmin</c> system column, configured globally in <c>AppDbContext</c> via
/// <c>UseXminAsConcurrencyToken()</c>. No explicit property is required on the entity.
/// </summary>
public interface IConcurrent { }
