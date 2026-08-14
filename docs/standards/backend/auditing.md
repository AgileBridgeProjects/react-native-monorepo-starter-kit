# Backend Auditing & EF Core Migrations — The Law

Load this file when: adding a new entity, writing EF Core migrations, reviewing audit coverage, working with concurrency tokens, or touching soft-delete behaviour.

---

## Entity Auditing — Mandatory Interfaces

All domain entities **must** implement the three auditing interfaces defined in `StarterKit.Data/Auditing/`. Two categories of entity are exempt from AuditLog writes but still require all three auditing interfaces — they carry `[ExcludeFromAuditLog]`:

- **Auth-infrastructure entities** (roles, permissions, user-role assignments) — system-managed, not business events
- **High-volume snapshot tables** (e.g. `DailyPlayerSnapshot`, `DailyGameSnapshot`) — written on a daily schedule; one AuditLog row per snapshot upsert would dwarf the actual data and provide no meaningful audit value

### Interfaces

| Interface | Location | Purpose |
|---|---|---|
| `IAuditable` | `StarterKit.Data/Auditing/IAuditable.cs` | `CreatedAt`, `UpdatedAt`, `CreatedBy?`, `UpdatedBy?` |
| `ISoftDeletable` | `StarterKit.Data/Auditing/ISoftDeletable.cs` | `IsDeleted`, `DeletedAt?`, `DeletedBy?` |
| `IConcurrent` | `StarterKit.Data/Auditing/IConcurrent.cs` | `uint RowVersion` (PostgreSQL `xmin` system column) |
| `[ExcludeFromAuditLog]` | `StarterKit.Data/Auditing/ExcludeFromAuditLogAttribute.cs` | Opts the entity out of the `AuditLog` table |

Every new domain entity class declaration **must** look like this:

```csharp
// CORRECT — full set for an auditable domain entity
public class MyEntity : IAuditable, ISoftDeletable, IConcurrent
{
    public Guid Id { get; set; }
    // ... domain properties ...

    // IAuditable
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    // ISoftDeletable
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public string? DeletedBy { get; set; }

    // IConcurrent — mapped to PostgreSQL's xmin system column
    public uint RowVersion { get; set; }
}

// CORRECT — auth-infrastructure entity: [ExcludeFromAuditLog] with all three interfaces still required
[ExcludeFromAuditLog]
public class RoleEntity : IAuditable, ISoftDeletable, IConcurrent
{
    public Guid Id { get; set; }
    ...
}

// CORRECT — high-volume snapshot entity: [ExcludeFromAuditLog] with all three interfaces still required
[ExcludeFromAuditLog]
public class DailyPlayerSnapshot : IAuditable, ISoftDeletable, IConcurrent
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid CompanyId { get; set; }
    public DateOnly Date { get; set; }
    ...
}
```

### When to use `[ExcludeFromAuditLog]`

| Scenario | Use? | Reason |
|---|---|---|
| Auth-infrastructure entities (roles, permissions) | ✅ Yes | System-managed; not business events |
| Daily snapshot / aggregate tables written by scheduled jobs | ✅ Yes | Millions of rows; no meaningful audit value |
| Business domain entities (users, games, companies) | ❌ No | Every change is a business event that must be traceable |
| `UserReportingExclusion` (explicit admin action) | ❌ No | Exclusion and un-exclusion are auditable business actions |

**Violations — never do this:**

```csharp
// VIOLATION: entity missing all auditing interfaces
public class MyEntity { public Guid Id { get; set; } }
// ← AuditCoverageTests will fail: "MyEntity must implement IAuditable or carry [ExcludeFromAuditLog]"

// VIOLATION: IAuditable without ISoftDeletable
public class MyEntity : IAuditable { ... }
// ← AuditCoverageTests will fail: "IAuditable entities must also implement ISoftDeletable and IConcurrent"

// VIOLATION: manually setting CreatedAt in application code
entity.CreatedAt = DateTime.UtcNow;
// ← AuditInterceptor owns all audit field writes; application code must never set them directly

// VIOLATION: ICurrentSession used directly in StarterKit.Data
using StarterKit.Core.Interfaces; // inside StarterKit.Data — circular dependency
public class MyInterceptor(ICurrentSession session) { }
// ← use IAuditUserContext (defined in StarterKit.Data) instead
```

---

## Interceptors

Two `SaveChangesInterceptor` implementations in `StarterKit.Data/Auditing/` run automatically on every `SaveChanges`/`SaveChangesAsync`:

| Interceptor | When it runs | What it does |
|---|---|---|
| `AuditInterceptor` | Before save | Sets `CreatedAt/By`, `UpdatedAt/By`; converts physical deletes → soft deletes |
| `AuditLogInterceptor` | During save (pre-commit) | Writes one `AuditLog` row per changed `IAuditable` entity in the same transaction |

Both interceptors are registered as **Scoped** (not Singleton) in `StarterKit.Data.Extensions.ServiceCollectionExtensions.AddStarterKitData()`, with `optionsLifetime: ServiceLifetime.Scoped`.

### `IAuditUserContext` Bridge

`IAuditUserContext` is defined in `StarterKit.Data/Auditing/` (not `StarterKit.Core`) to avoid a circular dependency. The production implementation `CurrentAuditUserContext` lives in `StarterKit.Auth` and bridges `ICurrentSession → IAuditUserContext`. Register via `StarterKit.Auth.Extensions.ServiceCollectionExtensions.AddStarterKitAuth()`.

Do **not** reference `ICurrentSession` from `StarterKit.Data`.

---

## Soft Deletes

All physical deletes are intercepted and converted to soft deletes. Global query filters in `AppDbContext.OnModelCreating` exclude `IsDeleted == true` rows from all standard queries.

For every `ISoftDeletable` entity, add the `IsDeleted` default to its EF config:

```csharp
builder.Property(x => x.IsDeleted).IsRequired().HasDefaultValue(false);
```

**Never** use `HasDefaultValueSql("now()")` on `CreatedAt` — the `AuditInterceptor` sets audit timestamps via `TimeProvider.Now()` before `SaveChanges`.

```csharp
// CORRECT: intentional bypass for admin/audit use cases
var includingDeleted = await _dbContext.MyEntities
    .IgnoreQueryFilters()
    .Where(x => x.IsDeleted)
    .ToListAsync();
```

---

## Concurrency (RowVersion / 409 Pattern)

`IConcurrent.RowVersion` maps to PostgreSQL's built-in `xmin` system column, which the database bumps on every row update. EF Core uses it as an optimistic-concurrency token via `UseXminAsConcurrencyToken()` in the entity configuration — no explicit column is added to the table.

When a `DbUpdateConcurrencyException` is thrown (two users modified the same row), the controller **must** return `409 Conflict`:

```csharp
// CORRECT: 409 on concurrency conflict
try
{
    await _service.UpdateAsync(id, request, cancellationToken);
    return NoContent();
}
catch (DbUpdateConcurrencyException)
{
    return Conflict(new { message = "The record was modified by another user. Please reload and try again." });
}
```

Do **not** silently swallow `DbUpdateConcurrencyException`. Do **not** retry automatically on concurrency conflicts in the application layer — let the client reload and resubmit.

---

## EF Core Migrations — The Law

**All migrations MUST be generated using the EF CLI. Never create or edit migration `.cs` or `.Designer.cs` files by hand.**

```bash
# CORRECT — always generate from the CLI
dotnet ef migrations add <Name> \
  --project src/StarterKit.Data \
  --startup-project src/StarterKit.MobileApi \
  --context AppDbContext

# VIOLATION — manually authoring migration files
# apps/backend/src/StarterKit.Data/Migrations/20260402000000_MyMigration.cs  ← created by hand
# apps/backend/src/StarterKit.Data/Migrations/20260402000000_MyMigration.Designer.cs  ← missing or created by hand
```

**Why this is non-negotiable:** Every migration has a `.Designer.cs` companion that contains the `[Migration("...")]` attribute and a full model snapshot. Without it EF Core cannot discover the migration at all — it is silently skipped when running `database update` or the Migrator, leaving every developer with a broken schema. The CLI generates both files together and ensures the snapshot is correct.

**Rules:**

- Never write a `.cs` migration file without also generating its `.Designer.cs` via the CLI
- Never commit a migration that does not have a matching `.Designer.cs` sibling
- Never modify the `Up()`/`Down()` body of a generated migration in a way that contradicts the entity configuration — update the entity config and re-generate instead
- If a migration is wrong, use `dotnet ef migrations remove` to delete it cleanly, then re-add after fixing the entity config
- **Empty migrations are forbidden** — if a migration has no SQL in `Up()`/`Down()`, delete it with `dotnet ef migrations remove` and resolve the underlying cause (e.g. snapshot drift, missing config) before committing

### Timestamps in `InsertData` seed migrations

When a hand-edited `Up()`/`Down()` body (e.g. a seed migration calling `migrationBuilder.InsertData(...)`) needs a `CreatedAt`-style value, use **`DateTime.UtcNow`** — never `DateTime.Now`, and never a hardcoded literal.

- **Never `DateTime.Now`** — it produces `DateTimeKind.Local`. Npgsql requires `DateTimeKind.Utc` for a `timestamptz` column and throws otherwise; a seed migration written this way fails the moment it actually runs against Postgres.
- **Never a hardcoded literal** (e.g. `new DateTime(2026, 7, 23, 0, 0, 0, DateTimeKind.Utc)`) — the "migrations must be deterministic" rule applies to EF's model-snapshot diffing (`HasData` in `OnModelCreating`, where a non-constant expression would make `dotnet ef migrations add` see spurious model changes on every run). It does **not** apply to values written imperatively inside `Up()` via `InsertData`/`Sql(...)` — that code runs once, whenever the migration is actually applied, so a real timestamp is both harmless and more accurate than a stand-in literal.

```csharp
// CORRECT
var createdAt = DateTime.UtcNow;

// VIOLATION — Local Kind, throws against a timestamptz column
var createdAt = DateTime.Now;

// VIOLATION — unnecessary; imperative Up() code isn't snapshot-diffed
var createdAt = new DateTime(2026, 7, 23, 0, 0, 0, DateTimeKind.Utc);
```

---

## AuditLog Table — Append-Only

`AuditLog` records are **append-only** — no update or delete endpoints may ever be added.

The table has compound indexes on `(EntityName, EntityId)` for efficient per-record history lookups, and on `Timestamp` for time-range queries.

`AuditLog` itself must carry `[ExcludeFromAuditLog]`.

---

## Guard Test (Enforcement)

`StarterKit.Data.Tests/Auditing/AuditCoverageTests.cs` contains three tests that **fail the build** if any new entity violates a rule:

1. Every entity in `StarterKit.Data` must implement `IAuditable` OR be decorated with `[ExcludeFromAuditLog]`
2. Every `IAuditable` entity must also implement `ISoftDeletable` and `IConcurrent`
3. `AuditLog` itself must carry `[ExcludeFromAuditLog]`

When you add a new entity, the guard test will fail until you add the correct interfaces. This is intentional — do not suppress the test.
