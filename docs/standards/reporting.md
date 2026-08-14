# Reporting Standards — The Law

Load this file when: adding a new snapshot table, writing a reporting repository, implementing a
reporting service, or working with `UserReportingExclusion`. For general repository rules see
`docs/standards/backend/repositories.md`.

---

## Overview — Snapshot Architecture

The reporting domain uses **pre-aggregated daily snapshot tables** rather than scanning raw
transactional data at query time. Each snapshot table stores one row per natural key per day.

| Table | Natural key | Grain |
|---|---|---|
| `DailyCompanySnapshots` | `(CompanyId, Date)` | Company-wide daily totals |
| `DailyDepartmentSnapshots` | `(DepartmentId, CompanyId, Date)` | Per-department daily totals |
| `DailyGameSnapshots` | `(GameId, CompanyId, Date)` | Per-game daily totals |
| `DailyPlayerSnapshots` | `(UserId, CompanyId, Date)` | Per-player daily totals |
| `UserReportingExclusions` | `(UserId, CompanyId)` | Users excluded from all reporting |

---

## Snapshot Entity Conventions

### Auditing interfaces — all three, always

Snapshot entities **must** implement `IAuditable`, `ISoftDeletable`, and `IConcurrent` — the
same as every other domain entity. The `AuditCoverageTests` guard test enforces this and will
fail the build if any entity is missing the interfaces.

Snapshot entities **must also** carry `[ExcludeFromAuditLog]`. Snapshot tables are written on
a daily schedule and can accumulate millions of rows; writing one `AuditLog` row per snapshot
upsert would dwarf the actual data and provide no meaningful audit value.

```csharp
// CORRECT — snapshot entity
[ExcludeFromAuditLog]
public class DailyPlayerSnapshot : IAuditable, ISoftDeletable, IConcurrent
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid CompanyId { get; set; }
    public DateOnly Date { get; set; }
    // ... metric properties ...

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

// VIOLATION: snapshot entity missing [ExcludeFromAuditLog]
public class DailyPlayerSnapshot : IAuditable, ISoftDeletable, IConcurrent { }
// ← will generate one AuditLog row per upsert — do not do this

// VIOLATION: snapshot entity missing auditing interfaces
[ExcludeFromAuditLog]
public class DailyPlayerSnapshot { }
// ← AuditCoverageTests will fail the build
```

### DateOnly — not DateTime

Use `DateOnly` for the day dimension. Snapshot tables represent daily aggregates, not
point-in-time events. `DateOnly` makes the intent explicit and avoids timezone-related
off-by-one bugs in date-range queries.

```csharp
// CORRECT
public DateOnly Date { get; set; }

// VIOLATION: DateTime for a daily dimension
public DateTime Date { get; set; }
// ← time component is meaningless and introduces timezone ambiguity
```

### Decimal precision — `HasPrecision(5, 2)` for rates and ratios

All percentage, accuracy, and rate fields must use `decimal` (not `float` or `double`) and be
configured with `HasPrecision(5, 2)` (values from 0.00 to 999.99, stored as two decimal places).

```csharp
// CORRECT: EF config
builder.Property(x => x.Accuracy).IsRequired().HasPrecision(5, 2);
builder.Property(x => x.CompletionRate).IsRequired().HasPrecision(5, 2);
builder.Property(x => x.AverageAccuracy).IsRequired().HasPrecision(5, 2);

// VIOLATION: float or double — imprecise for financial/reporting values
public float Accuracy { get; set; }
public double CompletionRate { get; set; }
```

### CompanyId — tenant scope on every snapshot entity

Every snapshot entity must carry `CompanyId` so that multitenancy query filters and impersonation
work correctly. Without it, a SuperAdmin impersonating Company A would see all companies' data.

```csharp
// CORRECT: CompanyId present on the snapshot
public Guid CompanyId { get; set; }

// VIOLATION: snapshot entity without CompanyId
public class DailyPlayerSnapshot { public Guid UserId { get; set; } ... }
// ← multitenancy filter cannot apply — all tenants' data is visible to anyone authenticated
```

---

## EF Core Configuration — Snapshot Tables

### Id — always `HasDefaultValueSql("gen_random_uuid()")`

Snapshot IDs are database-generated. Never rely on application-side `Guid.NewGuid()` for the
snapshot `Id` — the database default guarantees uniqueness without application involvement.

```csharp
builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
```

### Unique index on natural key

Every snapshot table must have a **unique index** on its natural key (the combination of
dimension FKs + `Date`). This is what makes the upsert pattern safe — the unique constraint
ensures no duplicate rows can exist for the same dimension on the same day.

```csharp
// CORRECT — DailyPlayerSnapshot natural key
builder
    .HasIndex(x => new { x.UserId, x.CompanyId, x.Date })
    .IsUnique();

// CORRECT — DailyDepartmentSnapshot natural key
builder
    .HasIndex(x => new { x.DepartmentId, x.CompanyId, x.Date })
    .IsUnique();
```

### Covering index on `(CompanyId, Date)`

Every snapshot table must have a **covering index** on `(CompanyId, Date)` to support the
common date-range query pattern (`WHERE CompanyId = @id AND Date >= @from AND Date <= @to`)
without a table scan.

```csharp
builder.HasIndex(x => new { x.CompanyId, x.Date });
```

### Full EF configuration reference

```csharp
internal sealed class DailyPlayerSnapshotConfig : IEntityTypeConfiguration<DailyPlayerSnapshot>
{
    public void Configure(EntityTypeBuilder<DailyPlayerSnapshot> builder)
    {
        builder.ToTable("DailyPlayerSnapshots");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(x => x.UserId).IsRequired();
        builder.Property(x => x.CompanyId).IsRequired();
        builder.Property(x => x.Date).IsRequired();
        builder.Property(x => x.SessionsPlayed).IsRequired();
        builder.Property(x => x.CorrectAnswers).IsRequired();
        builder.Property(x => x.TotalAnswers).IsRequired();
        builder.Property(x => x.Accuracy).IsRequired().HasPrecision(5, 2);
        builder.Property(x => x.SessionsPassed).IsRequired();
        builder.Property(x => x.CreatedAt).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired().HasDefaultValue(false);
        // Natural key — prevents duplicate rows for same player on same day
        builder.HasIndex(x => new { x.UserId, x.CompanyId, x.Date }).IsUnique();
        // Covering index — drives date-range queries efficiently
        builder.HasIndex(x => new { x.CompanyId, x.Date });
    }
}
```

---

## Upsert Pattern — `UpsertXxxAsync`

Snapshot writes are **idempotent**. Running the same daily aggregation job twice must produce
the same result, not insert a duplicate row. The upsert pattern achieves this by checking for an
existing row (including soft-deleted ones) before deciding to insert or update.

### Why `IgnoreQueryFilters()` is mandatory in the upsert

The soft-delete global query filter (`HasQueryFilter(e => !e.IsDeleted)`) hides deleted rows
from all standard queries. Without `IgnoreQueryFilters()`, a plain `FirstOrDefaultAsync` would
not see a soft-deleted snapshot row — the upsert would then try to insert a new row, violating
the unique index.

```csharp
// CORRECT: upsert that handles both soft-deleted and live rows
public async Task UpsertPlayerSnapshotAsync(
    DailyPlayerSnapshot snapshot,
    CancellationToken cancellationToken = default
)
{
    var existing = await _dbContext
        .DailyPlayerSnapshots.IgnoreQueryFilters()  // ← must include soft-deleted rows
        .FirstOrDefaultAsync(
            s => s.UserId == snapshot.UserId
              && s.CompanyId == snapshot.CompanyId
              && s.Date == snapshot.Date,
            cancellationToken
        );

    if (existing is null)
    {
        await _dbContext.DailyPlayerSnapshots.AddAsync(snapshot, cancellationToken);
    }
    else
    {
        // Update all metric fields in-place; reset soft-delete flag if row was deleted
        existing.SessionsPlayed = snapshot.SessionsPlayed;
        existing.CorrectAnswers = snapshot.CorrectAnswers;
        existing.TotalAnswers = snapshot.TotalAnswers;
        existing.Accuracy = snapshot.Accuracy;
        existing.SessionsPassed = snapshot.SessionsPassed;
        existing.IsDeleted = false;  // ← resurrect if previously soft-deleted
        existing.DeletedAt = null;   // ← clear the tombstone completely — a live row
        existing.DeletedBy = null;   //   must never still look deleted to audit inspection
    }

    await _dbContext.SaveChangesAsync(cancellationToken);
}

// VIOLATION: upsert without IgnoreQueryFilters — unique index violation on re-run after soft-delete
var existing = await _dbContext.DailyPlayerSnapshots
    .FirstOrDefaultAsync(s => s.UserId == ... && s.Date == ..., ct);
// ← if the row was soft-deleted, this returns null → AddAsync → unique index violation

// VIOLATION: plain AddAsync with no upsert check — duplicates on re-run
await _dbContext.DailyPlayerSnapshots.AddAsync(snapshot, ct);
await _dbContext.SaveChangesAsync(ct);
```

### What to update in the `else` branch

Update **all metric fields** and always reset the **full soft-delete tombstone**:
`IsDeleted = false`, `DeletedAt = null`, `DeletedBy = null`. Resetting only `IsDeleted` leaves a
live row whose audit columns still claim it was deleted — any inspection or query that reads
`DeletedAt`/`DeletedBy` then misreports the row. Do not update `Id`, `CreatedAt`,
`CreatedBy`, or any FK dimension fields — those are part of the natural key and must not change.

---

## Shared Repository — One Interface for Related Snapshot Types

Rather than creating one repository interface per snapshot table, group related snapshot types
under a single `IReportSnapshotRepository`. This keeps DI registration concise and makes the
relationship between snapshot types explicit.

```csharp
// CORRECT — one interface covers all four snapshot types
public interface IReportSnapshotRepository
{
    Task<IReadOnlyList<DailyCompanySnapshot>> GetCompanySnapshotsAsync(DateOnly from, DateOnly to, CancellationToken ct = default);
    Task UpsertCompanySnapshotAsync(DailyCompanySnapshot snapshot, CancellationToken ct = default);

    Task<IReadOnlyList<DailyPlayerSnapshot>> GetPlayerSnapshotsAsync(DateOnly from, DateOnly to, CancellationToken ct = default);
    Task UpsertPlayerSnapshotAsync(DailyPlayerSnapshot snapshot, CancellationToken ct = default);

    Task<IReadOnlyList<DailyGameSnapshot>> GetGameSnapshotsAsync(DateOnly from, DateOnly to, CancellationToken ct = default);
    Task UpsertGameSnapshotAsync(DailyGameSnapshot snapshot, CancellationToken ct = default);

    Task<IReadOnlyList<DailyDepartmentSnapshot>> GetDepartmentSnapshotsAsync(DateOnly from, DateOnly to, CancellationToken ct = default);
    Task UpsertDepartmentSnapshotAsync(DailyDepartmentSnapshot snapshot, CancellationToken ct = default);
}

// VIOLATION: one repository per snapshot table — overly granular
public interface IDailyPlayerSnapshotRepository { ... }
public interface IDailyGameSnapshotRepository { ... }
public interface IDailyDepartmentSnapshotRepository { ... }
```

### Date-range query signature

All `GetXxxSnapshotsAsync` methods accept `DateOnly from, DateOnly to` — not `DateTime`, not
`string`, not separate `year`/`month`/`day` params. The caller is responsible for clamping the
range to a sensible window before calling the repository.

```csharp
// CORRECT
Task<IReadOnlyList<DailyPlayerSnapshot>> GetPlayerSnapshotsAsync(
    DateOnly from,
    DateOnly to,
    CancellationToken cancellationToken = default
);

// VIOLATION: DateTime date-range params
Task<IReadOnlyList<DailyPlayerSnapshot>> GetPlayerSnapshotsAsync(DateTime from, DateTime to, ...);
```

---

## UserReportingExclusion — Re-Exclusion Resurrection

`UserReportingExclusion` allows a user to be excluded from all reporting aggregates. The entity
has a unique index on `(UserId, CompanyId)`. When a user is un-excluded (soft-deleted) and then
re-excluded, the `AddAsync` must use `IgnoreQueryFilters()` to resurrect the soft-deleted row
rather than inserting a new one (which would violate the unique index).

```csharp
// CORRECT: AddAsync with re-exclusion resurrection
public async Task AddAsync(
    UserReportingExclusion exclusion,
    CancellationToken cancellationToken = default
)
{
    // Check for a previously soft-deleted row before inserting — a plain Add would violate
    // the unique (UserId, CompanyId) index when re-excluding a user who was un-excluded.
    var existing = await _dbContext
        .UserReportingExclusions.IgnoreQueryFilters()
        .FirstOrDefaultAsync(
            x => x.UserId == exclusion.UserId && x.CompanyId == exclusion.CompanyId,
            cancellationToken
        );

    if (existing is not null)
    {
        existing.IsDeleted = false;
        existing.DeletedAt = null;
        existing.DeletedBy = null;
        existing.Reason = exclusion.Reason;
    }
    else
    {
        await _dbContext.UserReportingExclusions.AddAsync(exclusion, cancellationToken);
    }

    await _dbContext.SaveChangesAsync(cancellationToken);
}

// VIOLATION: plain AddAsync — unique index violation on re-exclusion after un-exclusion
await _dbContext.UserReportingExclusions.AddAsync(exclusion, ct);
// ← if the user was previously excluded and un-excluded (soft-deleted row exists), this throws
```

The `DeleteByUserIdAsync` uses a soft-delete via the `AuditInterceptor` — it calls
`_dbContext.UserReportingExclusions.Remove(entity)` and lets the interceptor convert it to a
soft delete. Do not manually set `IsDeleted = true`.

---

## Query-Time Exclusions — the `ExcludedUserIds` Helper

The refresh job already builds snapshot rows with excluded users removed, but several report
queries also count **live `Users` rows** (e.g. a team's `TotalUsers` denominator). Any such count
that ignores `UserReportingExclusion` re-inflates a figure the snapshot-derived counts leave out —
an excluded test/service account then silently skews participation rates.

Every reporting query that counts live `Users` rows must filter through the single
`ExcludedUserIds(clubId)` `IQueryable<Guid>` helper on `ReportSnapshotRepository`, so all call
sites apply the exact same exclusion and EF translates it to one `NOT EXISTS`/`NOT IN`:

```csharp
// CORRECT — the one shared helper, applied at every live-Users count
private IQueryable<Guid> ExcludedUserIds(Guid clubId) =>
    _dbContext
        .UserReportingExclusions.Where(e => !e.IsDeleted && e.ClubId == clubId)
        .Select(e => e.UserId);

.Count(u => ... && !ExcludedUserIds(clubId).Contains(u.Id))

// VIOLATION: counting live Users without the exclusion filter
.Count(u => u.ClubId == clubId && u.IsActive)
// ← excluded accounts inflate the denominator the snapshots already left out
```

The explicit `!e.IsDeleted` inside the helper is load-bearing: composed queries that call
`IgnoreQueryFilters()` anywhere disable the entity's global filter for the whole query, and an
un-excluded (soft-deleted) row must never keep suppressing a user.

---

## SnapshotBackfillRun — Once-Per-Day Startup Recompute Tracking

`StartupSnapshotBackfillJob` re-aggregates a trailing self-heal window (14 days) on startup, but
only **once per calendar day** — redeploying five times in an afternoon must not re-aggregate the
same window five times. The "already ran today" signal is a dedicated `SnapshotBackfillRuns` row,
**never** inferred from side-effects on snapshot data:

- A snapshot row dated `today` is indistinguishable from the nightly
  `report-snapshot-refresh-nightly` job's output — inferring from it produces false-positive skips.
- `StartedAt` is written **before** the work and `CompletedAt` **after** it. A crash mid-run
  leaves `CompletedAt` null, so the next startup correctly re-attempts instead of skipping.
- A genuine gap (a stale or empty snapshot table) is always backfilled, even when the recompute
  window already ran today — the run record only gates the redundant self-heal pass.
- The job carries `[DisableConcurrentExecution(timeoutInSeconds: 0)]` and
  `[AutomaticRetry(Attempts = 0)]` so simultaneous instance startups (rolling deploys) cannot run
  the recompute concurrently, and a skipped duplicate fails fast instead of queueing.

`SnapshotBackfillRun` follows the standard snapshot entity conventions (`IAuditable`,
`ISoftDeletable`, `IConcurrent`, `[ExcludeFromAuditLog]`) with a unique index on `Date`. It is
**not** tenant-scoped — one run record per calendar day covers every club's snapshots.

---

## TrendPeriodHelper — Never Plot an In-Progress Bucket

A daily snapshot refresh can only capture activity that has happened by the time it runs, so a
trend bucket covering "today" / "this week" / "this month" is inherently partial and mechanically
depressed relative to a complete period. Plotting it produces a false cliff at the end of every
trend chart, and feeding it to `ForecastCalculator` poisons the forecast's anchor point.

Every trend series **must** drop the incomplete trailing bucket via `TrendPeriodHelper` before
building points or forecasts:

```csharp
// CORRECT — only fully-elapsed buckets reach the series and the forecast
var today = DateOnly.FromDateTime(clock.Now());
var grouped = snapshots
    .GroupBy(s => GroupKey(s.Date, granularity))
    .Where(g => TrendPeriodHelper.IsComplete(g.Key, granularity, today))
    .OrderBy(g => g.Key)
    ...

// VIOLATION: plotting whatever buckets exist
var grouped = snapshots.GroupBy(s => GroupKey(s.Date, granularity)).OrderBy(g => g.Key)...
// ← the trailing partial bucket plots as a false cliff and skews the forecast
```

`ForecastCalculator.Compute(...)` must only ever receive points that survived this filter.

---

## Adding a New Snapshot Table

Checklist for adding a new daily snapshot entity:

1. **Model** in `StarterKit.Data/Reports/Models/` — implement `IAuditable`, `ISoftDeletable`, `IConcurrent`; add `[ExcludeFromAuditLog]`; use `DateOnly Date` and `Guid CompanyId`; use `decimal` with `HasPrecision(5, 2)` for rate/ratio fields
2. **EF Config** in `StarterKit.Data/Reports/Configurations/` — `HasDefaultValueSql("gen_random_uuid()")`, unique index on natural key, covering index on `(CompanyId, Date)`
3. **Repository method** on `IReportSnapshotRepository` — add `GetXxxSnapshotsAsync` + `UpsertXxxAsync` pair; implement using the upsert pattern with `IgnoreQueryFilters()`
4. **Migration** — generate via CLI (`dotnet ef migrations add ...`); never hand-write migration files
5. **Multitenancy** — add `HasQueryFilter` in `AppDbContext.ApplyMultitenancyFilters` for the new entity
6. **ERD** — update `docs/erd.md` to include the new table
7. **Tests** — add upsert and date-range query tests in `StarterKit.Data.Tests/Reports/Repositories/`
