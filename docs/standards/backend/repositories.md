# Backend Repositories — The Law

Load this file when: writing or reviewing repository interfaces/implementations, adding query methods, or working on pagination/sorting. For testing repositories see `testing.md`.

---

## Repository Conventions

- Every repository interface **must** expose both lookup methods:
  - `FindByIdAsync` — returns `T?` (null if not found); callers handle the null case
  - `GetAsync` — returns `T`, throws `InvalidOperationException` via `DbSetExtensions.GetAsync` if not found; use for operations that require the entity to exist
- The service layer calls `GetAsync` when the entity must exist; it calls `FindByIdAsync` only when a null result is a valid non-error outcome
- Never use `FindAsync` + silent null check in `DeleteAsync` — always throw if the entity is missing
- When an entity has a foreign key relationship, add a `GetWithNavigationPropertiesAsync` method that returns the primary entity with its related entity eagerly loaded via `Include`
- When inserting multiple entities of the same type, add an `AddManyAsync(IReadOnlyList<T>, CancellationToken)` method that calls `AddRangeAsync` + a single `SaveChangesAsync`. **Never** loop `AddAsync` per item — that issues one `INSERT` + one `SaveChangesAsync` per entity

```csharp
// VIOLATION: per-item loop — N round-trips to the database
foreach (var item in items)
    await _repository.AddAsync(item, ct);

// CORRECT: single bulk insert
public async Task AddManyAsync(IReadOnlyList<Foo> items, CancellationToken ct = default)
{
    await _dbContext.Foos.AddRangeAsync(items, ct);
    await _dbContext.SaveChangesAsync(ct);
}
```

This applies just as much when the **service layer** loops to resolve/validate per-item state before
writing — the validation loop is fine, but collect the results and issue **one** bulk repository call
after the loop, never a per-item repository call inside it. A bulk method's inputs don't have to share
a single parent id — a batch spanning many distinct owners is still one round-trip if the method takes
a list of pairs/tuples and does one existence-check query + one `AddRangeAsync` + one `SaveChangesAsync`.

```csharp
// VIOLATION: validation loop is fine, but each iteration hits the DB (N inserts + N SaveChanges)
foreach (var (athleteId, guardianEmail) in pendingLinks)
{
    var guardianId = await ResolveGuardianId(guardianEmail, ct); // per-item validation — OK
    if (guardianId is null) continue;
    await _userRepository.AddGuardianLinkAsync(guardianId.Value, athleteId, ct); // ← N round-trips
}

// CORRECT: same per-item validation, but collect results and write once after the loop
var resolvedLinks = new List<(Guid GuardianId, Guid AthleteId)>();
foreach (var (athleteId, guardianEmail) in pendingLinks)
{
    var guardianId = await ResolveGuardianId(guardianEmail, ct);
    if (guardianId is null) continue;
    resolvedLinks.Add((guardianId.Value, athleteId));
}
await _userRepository.BulkAddGuardianLinksAsync(resolvedLinks, ct); // one round-trip, any # of owners

// CORRECT: the bulk method itself — one existence-check query, one AddRangeAsync, one SaveChangesAsync
public async Task BulkAddGuardianLinksAsync(
    IReadOnlyList<(Guid GuardianId, Guid AthleteId)> links,
    CancellationToken ct = default)
{
    if (links.Count == 0) return;

    var guardianIds = links.Select(l => l.GuardianId).Distinct().ToList();
    var athleteIds = links.Select(l => l.AthleteId).Distinct().ToList();
    var existing = (await _db.UserGuardians
            .Where(x => guardianIds.Contains(x.GuardianId) && athleteIds.Contains(x.DependentId))
            .Select(x => new { x.GuardianId, x.DependentId })
            .ToListAsync(ct))
        .Select(e => (e.GuardianId, e.DependentId))
        .ToHashSet();

    var toAdd = links
        .Distinct()
        .Where(l => !existing.Contains((l.GuardianId, l.AthleteId)))
        .Select(l => new UserGuardianEntity { Id = Guid.NewGuid(), GuardianId = l.GuardianId, DependentId = l.AthleteId })
        .ToList();
    if (toAdd.Count == 0) return;

    await _db.UserGuardians.AddRangeAsync(toAdd, ct);
    await _db.SaveChangesAsync(ct);
}
```

```csharp
// VIOLATION: missing GetAsync — repository only has FindByIdAsync
public interface IFooRepository
{
    Task<Foo?> FindByIdAsync(Guid id, CancellationToken ct = default);
}

// VIOLATION: silent failure on delete
var entity = await _dbContext.Set.FindAsync([id], ct);
if (entity is not null) { _dbContext.Set.Remove(entity); await _dbContext.SaveChangesAsync(ct); }

// CORRECT: both methods on every repo
public interface IFooRepository
{
    Task<Foo?> FindByIdAsync(Guid id, CancellationToken ct = default);
    Task<Foo> GetAsync(Guid id, CancellationToken ct = default);
}

// CORRECT: implementation using the shared extension
public Task<Foo?> FindByIdAsync(Guid id, CancellationToken ct = default) =>
    _db.Foos.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);

public Task<Foo> GetAsync(Guid id, CancellationToken ct = default) =>
    _db.Foos.GetAsync(id, ct); // throws InvalidOperationException if missing

// CORRECT: DeleteAsync
var entity = await _dbContext.Foos.GetAsync(id, ct);
_dbContext.Foos.Remove(entity);
await _dbContext.SaveChangesAsync(ct);
```

---

## Conditional Filtering — `WhereIf<T>` Extension

All repository methods that apply optional filters **must** chain `WhereIf` calls instead of branching with `if (value.HasValue) query = query.Where(...)`.

`QueryableExtensions.WhereIf<T>` lives in `StarterKit.Data/Extensions/QueryableExtensions.cs` and is `internal` — use it only inside `StarterKit.Data`.

```csharp
// StarterKit.Data/Extensions/QueryableExtensions.cs  (internal — do not make public)
public static IQueryable<T> WhereIf<T>(
    this IQueryable<T> query,
    bool condition,
    Expression<Func<T, bool>> predicate
) => condition ? query.Where(predicate) : query;
```

```csharp
// VIOLATION: if-statement filter chain
if (questionType.HasValue)
    query = query.Where(q => q.QuestionType == questionType.Value);
if (difficulty.HasValue)
    query = query.Where(q => q.Difficulty == difficulty.Value);

// CORRECT: WhereIf chain
query = query
    .WhereIf(generationBatchId.HasValue, q => q.GenerationBatchId == generationBatchId!.Value)
    .WhereIf(questionType.HasValue,      q => q.QuestionType == questionType!.Value)
    .WhereIf(difficulty.HasValue,        q => q.Difficulty == difficulty!.Value);
```

---

## Server-Side Sorting — `ApplySorting<T>` Extension

All list/paginated repository methods that accept user-supplied sort parameters **must** use `QueryableExtensions.ApplySorting<T>`. **Never use Dynamic LINQ (`System.Linq.Dynamic.Core`) or string-interpolate property names into raw SQL.**

`ApplySorting<T>` builds an `OrderBy`/`OrderByDescending` call at runtime using expression trees. Property lookup is **case-insensitive**. An unrecognised property name throws `ArgumentException` which the global exception handler translates to `400 Bad Request`.

```csharp
// VIOLATION: Dynamic LINQ (extra NuGet dependency, SQL injection risk)
query = query.OrderBy($"{sortBy} {(sortDescending ? "descending" : "ascending")}");

// VIOLATION: raw Skip/Take instead of ApplyPaging (misses safe-page clamping)
var items = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

// CORRECT: call the shared extensions
var q = _db.Companies.ApplySorting(sortBy, sortDescending, defaultSort: "Name");
var items = await q.ApplyPaging(page, pageSize).ToListAsync(ct);
```

### API Contract for Sorting

| Param | Type | Default | Example |
|---|---|---|---|
| `SortBy` | `string?` | (see defaultSort) | `SortBy=name` |
| `SortDescending` | `bool` | `false` | `SortDescending=true` |

---

## Soft-Delete — Global Query Filters

All `ISoftDeletable` entities have `HasQueryFilter(e => !e.IsDeleted)` configured in `AppDbContext.ConfigureSoftDeleteFilters`. **Do not add `.Where(c => !c.IsDeleted)` in repository queries** — the filter is applied automatically.

Only call `.IgnoreQueryFilters()` explicitly when you intentionally need to include deleted records.

---

## Upsert Pattern — Idempotent Writes with Soft-Delete Awareness

Use the upsert pattern when an `AddAsync` must be idempotent — i.e., calling it twice with the same natural key must not create a duplicate row or throw a unique-index violation. The canonical use cases are:

- **Snapshot tables** — daily aggregation jobs re-run; the upsert updates existing metrics rather than inserting duplicates
- **Exclusion/allow-list entities** — a user can be added, removed (soft-deleted), and re-added; the upsert resurrects the soft-deleted row rather than inserting a new one

### Why `IgnoreQueryFilters()` is mandatory

The soft-delete global query filter hides deleted rows from all standard queries. Without `IgnoreQueryFilters()`, a `FirstOrDefaultAsync` on a soft-deleted row returns `null` — the upsert then tries to insert a new row, violating the unique index.

```csharp
// CORRECT: upsert that handles both soft-deleted and live rows
public async Task UpsertAsync(MyEntity incoming, CancellationToken ct = default)
{
    var existing = await _dbContext
        .MyEntities.IgnoreQueryFilters()   // ← include soft-deleted rows in the lookup
        .FirstOrDefaultAsync(
            x => x.ForeignKeyId == incoming.ForeignKeyId && x.CompanyId == incoming.CompanyId,
            ct
        );

    if (existing is null)
    {
        await _dbContext.MyEntities.AddAsync(incoming, ct);
    }
    else
    {
        // Update metrics; reset soft-delete flag if the row was previously deleted
        existing.SomeMetric = incoming.SomeMetric;
        existing.IsDeleted = false;   // ← resurrect soft-deleted row
        existing.DeletedAt = null;
        existing.DeletedBy = null;
    }

    await _dbContext.SaveChangesAsync(ct);
}

// VIOLATION: upsert without IgnoreQueryFilters — unique index violation if row was soft-deleted
var existing = await _dbContext.MyEntities
    .FirstOrDefaultAsync(x => x.ForeignKeyId == incoming.ForeignKeyId, ct);
// ← soft-deleted row is invisible → null → AddAsync → unique index violation

// VIOLATION: plain AddAsync with no upsert check — duplicates on re-run
await _dbContext.MyEntities.AddAsync(incoming, ct);
await _dbContext.SaveChangesAsync(ct);
```

### What to update in the `else` branch

Update **all metric/data fields** and always reset `IsDeleted = false`, `DeletedAt = null`, `DeletedBy = null`. Do not update `Id`, `CreatedAt`, `CreatedBy`, or any FK dimension fields — those are part of the natural key.

See `docs/standards/reporting.md` for the full snapshot and exclusion patterns.

---

## TimeProvider Conventions

Always use the `Now()` extension method from `StarterKit.Data.Extensions.TimeProviderExtensions` — never call `GetUtcNow()` directly on `TimeProvider`.

```csharp
// VIOLATION
var deadline = _clock.GetUtcNow().Add(timeout);

// CORRECT
var deadline = _clock.Now().Add(timeout);
```

---

## Repository List Return Type

Repositories in `StarterKit.Data` **cannot** reference `StarterKit.Core` (circular dependency). They must **never** define a custom `*ListResult` class. The established pattern is:

- **Repository** returns `(IReadOnlyList<T> Items, int TotalCount)` — raw data only
- **Service** constructs `PagedResult<T>` using the tuple + `ClampedPage` / `ClampedPageSize` values

```csharp
// CORRECT — repository (StarterKit.Data)
Task<(IReadOnlyList<Company> Items, int TotalCount)> ListAsync(int page, int pageSize, ...);

// CORRECT — service (StarterKit.Core)
var (items, totalCount) = await _repository.ListAsync(query.ClampedPage, query.ClampedPageSize, ...);
return new PagedResult<Company>
{
    Items      = items,
    TotalCount = totalCount,
    Page       = query.ClampedPage,
    PageSize   = query.ClampedPageSize,
};

// VIOLATION — custom class in StarterKit.Data that duplicates PagedResult<T>
public sealed class CompanyListResult { public IReadOnlyList<Company> Items ... }

// VIOLATION — inline pagination defaults on repository/service signatures
Task<...> ListAsync(int page = 1, int pageSize = 20, ...); // use PagingConstants, not magic numbers
```

`PagingConstants` (`StarterKit.Core/Common/PagingConstants.cs`) owns the single source of truth: `DefaultPage = 1`, `DefaultPageSize = 50`, `MaxPageSize = 250`.

### Paging Query Objects

All list query objects extend `PagedAndFilteredQuery`. **Never** read `query.Page` or `query.PageSize` directly — always use the clamped helpers:

| Property | What it does |
|---|---|
| `query.ClampedPage` | Returns `Math.Max(1, Page)` |
| `query.ClampedPageSize` | Returns `Math.Max(1, Math.Min(PageSize, PagingConstants.MaxPageSize))` |
