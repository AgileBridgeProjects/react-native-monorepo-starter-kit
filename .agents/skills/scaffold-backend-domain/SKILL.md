---
name: scaffold-backend-domain
description: >
  Scaffold a new backend domain entity across all required files. Use when a user asks to
  create, scaffold, or add a new domain entity, model, or data type to the backend. Also
  triggers for phrases like "scaffold entity", "create domain entity", "add new entity",
  "new backend domain", or "create repository for".
---

# Scaffold Backend Domain Entity

Your task is to scaffold a complete backend domain entity following the StarterKit conventions.
The codegen script handles boilerplate deterministically — your job is to fill in the
domain-specific logic after the script runs.

---

## Step 0 — Gather inputs (ask if not provided)

Before scaffolding, confirm you have:

| Input | Description | Example |
|---|---|---|
| **Entity name** | PascalCase singular noun | `QuizAttempt` |
| **Module** | Folder under `StarterKit.Data/` and `StarterKit.Core/` | `AI` (default) |
| **Properties** | Name, C# type, nullable?, FK target (if any) | see below |
| **Table name** | Plural PascalCase (default: `{Entity}s`) | `QuizAttempts` |
| **Has state machine?** | Does the entity have a status lifecycle? | yes / no |

**Example property list the user might provide:**
```
Id            Guid        required    (primary key — always include)
QuizId        Guid        required    FK → Quiz
UserId        string      required
Score         int         required
CompletedAt   DateTime?   nullable
CreatedAt     DateTime    required
```

If the user did not provide properties, ask before proceeding.

---

## Step 1 — Run the scaffold script

Run the codegen script first. It generates the full vertical stack (Data → Core → API + tests)
with correct namespaces, file locations, and interface stubs so you only fill in domain logic.

```bash
node tools/scaffold-backend-feature.mjs --module {Module} --entity {Entity}
# Add --tenant if the entity is company-scoped (adds CompanyId + [AllowImpersonation])
# Add --api web or --api both if a WebApi controller is also needed
```

The script creates 20 files across StarterKit.Data, StarterKit.Core, StarterKit.MobileApi, and their
test projects. Review the "Next steps" list it prints — it includes the AppDbContext DbSet
registration, DI wiring, and migration command.

**After running the script**, read these two files for domain-specific context before editing:

1. `apps/backend/src/StarterKit.Data/Persistence/AppDbContext.cs` — add the new `DbSet<T>`
2. One existing model for reference (e.g. `apps/backend/src/StarterKit.Data/AI/Models/AiJob.cs`)

---

## Step 2 — Fill in domain-specific logic

The scaffold script generates stub files. Now fill in the domain-specific details that
require human (or AI) judgment. Work through each generated file in this order:

---

### File 1 — Domain model
**Path:** `apps/backend/src/StarterKit.Data/{Module}/Models/{Entity}.cs`

```csharp
// Namespace pattern: StarterKit.Data.{Module}.Models
using StarterKit.Data.Auditing;

namespace StarterKit.Data.{Module}.Models;

public class {Entity} : IAuditable, ISoftDeletable, IConcurrent
{
    public Guid Id { get; set; }

    // --- scalar properties ---
    // {each non-FK, non-navigation property}
    public {Type} {PropertyName} { get; set; }  // required
    public {Type}? {PropertyName} { get; set; } // nullable

    // --- foreign keys ---
    public Guid {RelatedEntity}Id { get; set; }

    // --- navigation properties ---
    public {RelatedEntity} {RelatedEntity} { get; set; } = null!;

    // --- ONLY include state machine methods if the entity has a status lifecycle ---
    // If HasStateMachine = true, add Start/Complete/Fail methods following AiJob pattern:
    //
    // public {StatusEnum} Status { get; private set; } = {StatusEnum}.{InitialState};
    //
    // public void {Transition}(TimeProvider clock)
    // {
    //     if (Status != {StatusEnum}.{RequiredStatus})
    //         throw new InvalidOperationException(
    //             $"Cannot {transition} a {entity} with status '{Status}'. {Entity} must be '{StatusEnum}.{RequiredStatus}'."
    //         );
    //     Status = {StatusEnum}.{NewStatus};
    //     {TimestampProperty} = clock.Now();
    // }

    // IAuditable (set automatically by AuditInterceptor — never set manually in application code)
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    // ISoftDeletable (soft-delete is handled automatically by AuditInterceptor)
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public string? DeletedBy { get; set; }

    // IConcurrent (RowVersion maps to PostgreSQL's xmin system column — never set manually)
    public uint RowVersion { get; set; }
}
```

**Rules:**
- No constructor — use object initializer syntax
- Navigation properties use `= null!` (required EF nav) or `= []` (collection navs)
- Status and computed properties use `private set`
- Use `StarterKit.Data.Extensions` for `clock.Now()` (import `using StarterKit.Data.Extensions;`)
- Always add `using StarterKit.Data.Auditing;` and implement `IAuditable, ISoftDeletable, IConcurrent`
- **Never** manually set `CreatedAt`, `UpdatedAt`, `CreatedBy`, `UpdatedBy`, `IsDeleted`, `DeletedAt`, `DeletedBy`, or `RowVersion` in application code — the audit fields are managed exclusively by the audit interceptors and `RowVersion` (`xmin`) is managed by PostgreSQL itself
- If there are enums on this entity, create them in `StarterKit.Data/{Module}/Enums/{EnumName}.cs` with **explicit integer values**

---

### File 2 — EF Core configuration
**Path:** `apps/backend/src/StarterKit.Data/{Module}/Configurations/{Entity}Config.cs`

```csharp
using StarterKit.Data.{Module}.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace StarterKit.Data.{Module}.Configurations;

internal sealed class {Entity}Config : IEntityTypeConfiguration<{Entity}>
{
    public void Configure(EntityTypeBuilder<{Entity}> builder)
    {
        builder.ToTable("{TableName}");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

        // Optimistic concurrency — map RowVersion to PostgreSQL's xmin system column:
        builder.UseXminAsConcurrencyToken();

        // Required scalar properties:
        builder.Property(x => x.{Property}).IsRequired();

        // String max lengths — set ONLY for bounded strings (identifiers, names, provider keys, etc.):
        builder.Property(x => x.{StringProperty}).IsRequired().HasMaxLength({N});
        // For large text fields (payloads, results, error messages, log content), omit HasMaxLength
        // to keep them as unbounded text and avoid accidental truncation.

        // Enum defaults (do NOT use HasConversion<string>()):
        builder.Property(x => x.{EnumProperty}).IsRequired().HasDefaultValue({EnumType}.{Default});

        // ISoftDeletable — required for all domain entities:
        builder.Property(x => x.IsDeleted).IsRequired().HasDefaultValue(false);

        // Note: do NOT add HasDefaultValueSql("now()") for CreatedAt — the
        // AuditInterceptor sets it via TimeProvider before SaveChanges.

        // Foreign key relationships (one-to-many example):
        builder
            .HasOne(x => x.{RelatedEntity})
            .WithMany(x => x.{CollectionNavOnRelated})
            .HasForeignKey(x => x.{RelatedEntity}Id);
    }
}
```

**Rules:**
- Class is `internal sealed`
- Never call `HasConversion<string>()` on enum properties — they store as `int` by default
- Never call `HasMaxLength()` on enum properties
- Only call `HasMaxLength()` on **bounded** string properties (identifiers, names, provider keys, etc.) — omit it for large text fields (payloads, results, error messages) to keep them unbounded `text`
- `gen_random_uuid()` for Guid PKs; never add a SQL default for CreatedAt (the AuditInterceptor sets it)
- Always call `UseXminAsConcurrencyToken()` so `RowVersion` maps to PostgreSQL's `xmin` system column

---

### File 3 — Repository interface
**Path:** `apps/backend/src/StarterKit.Data/{Module}/Interfaces/Repositories/I{Entity}Repository.cs`

```csharp
using StarterKit.Data.{Module}.Models;

namespace StarterKit.Data.{Module}.Interfaces.Repositories;

public interface I{Entity}Repository
{
    Task AddAsync({Entity} entity, CancellationToken cancellationToken = default);
    Task<{Entity}?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<{Entity}> GetAsync(Guid id, CancellationToken cancellationToken = default);
    Task UpdateAsync({Entity} entity, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);

    // If the entity has FK navigation properties, always include this method:
    Task<{Entity}?> GetWithNavigationPropertiesAsync(Guid id, CancellationToken cancellationToken = default);

    // Add any other custom query methods the entity needs, e.g.:
    // Task<IReadOnlyList<{Entity}>> GetBy{RelatedEntity}IdAsync(Guid {relatedEntity}Id, CancellationToken cancellationToken = default);
}
```

**Rules:**
- `FindByIdAsync` returns `T?` — callers handle null
- `GetAsync` returns `T` — throws `InvalidOperationException` via `DbSetExtensions.GetAsync`
- Interface lives in `StarterKit.Data` (never `StarterKit.Core`) — Core references Data, not vice versa

---

### File 4 — Repository implementation
**Path:** `apps/backend/src/StarterKit.Data/{Module}/Repositories/{Entity}Repository.cs`

```csharp
using StarterKit.Data.{Module}.Interfaces.Repositories;
using StarterKit.Data.{Module}.Models;
using StarterKit.Data.Extensions;
using StarterKit.Data.Postgres;
using Microsoft.EntityFrameworkCore;

namespace StarterKit.Data.{Module}.Repositories;

public class {Entity}Repository : I{Entity}Repository
{
    private readonly AppDbContext _dbContext;

    public {Entity}Repository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync({Entity} entity, CancellationToken cancellationToken = default)
    {
        await _dbContext.{Entities}.AddAsync(entity, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<{Entity}?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.{Entities}.FindAsync([id], cancellationToken);
    }

    public async Task<{Entity}> GetAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.{Entities}.GetAsync(id, cancellationToken);
    }

    public async Task UpdateAsync({Entity} entity, CancellationToken cancellationToken = default)
    {
        _dbContext.{Entities}.Update(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _dbContext.{Entities}.GetAsync(id, cancellationToken);
        _dbContext.{Entities}.Remove(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    // Generate this method when the entity has FK navigation properties.
    // Include one .Include() call per navigation property so callers get
    // the full graph in one query rather than issuing multiple repository calls.
    public async Task<{Entity}?> GetWithNavigationPropertiesAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext
            .{Entities}
            .Include(x => x.{RelatedEntity})        // repeat per nav property
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }
}
```

**Rules:**
- `DeleteAsync` calls `GetAsync` (throws if missing) — never silent null check
- `FindByIdAsync` uses `FindAsync` for PK lookups (benefits from EF identity map)
- `{Entities}` is the DbSet property name on AppDbContext (plural PascalCase)
- When the entity has **any FK / navigation property**, always generate `GetWithNavigationPropertiesAsync` with one `Include()` per nav property — this replaces multiple sequential repository calls with a single query
- When bulk-inserting multiple entities, add `AddManyAsync(IReadOnlyList<{Entity}>, CancellationToken)` using `AddRangeAsync` + one `SaveChangesAsync`. Never loop `AddAsync` per item.

---

### File 5 — Update AppDbContext
**Path:** `apps/backend/src/StarterKit.Data/Persistence/AppDbContext.cs`

Add the new `DbSet` property and the `using` for the new model namespace (if not already present):

```csharp
// Add using at top if needed:
using StarterKit.Data.{Module}.Models;

// Add inside AppDbContext class, alongside existing DbSet properties:
public DbSet<{Entity}> {Entities} => Set<{Entity}>();
```

`OnModelCreating` uses `ApplyConfigurationsFromAssembly` — no changes needed there.

---

### File 6a — Schema tests (always generate)
**Path:** `apps/backend/tests/StarterKit.Data.Tests/{Module}/Models/{Entity}SchemaTests.cs`

Always generate this file for every entity. It validates that EF Core can persist the entity
and that required properties have the expected defaults/values.

```csharp
using FluentAssertions;
using StarterKit.Data.{Module}.Models;

namespace StarterKit.Data.Tests.{Module}.Models;

public abstract class {Entity}SchemaTests
{
    protected static {Entity} Create{Entity}() =>
        new()
        {
            Id = Guid.NewGuid(),
            // {initialize all required properties with sensible defaults}
            CreatedAt = DateTime.UtcNow,
        };

    public sealed class Properties : {Entity}SchemaTests
    {
        [Fact]
        public void Create{Entity}_WithRequiredProperties_HasExpectedDefaults()
        {
            var entity = Create{Entity}();

            // assert required properties are set
            entity.Id.Should().NotBeEmpty();
            // add property-specific assertions
        }
    }
}
```

---

### File 6b — Domain / state-machine tests (only when `HasStateMachine = true`)
**Path:** `apps/backend/tests/StarterKit.Data.Tests/{Module}/Models/{Entity}DomainTests.cs`

Generate this file **only** when the entity has a status lifecycle with transition methods.
Mirror the `AiJobDomainTests` pattern exactly:

- Abstract base class with factory method
- Nested `public sealed class` per transition (Start, Complete, Fail, etc.)
- Test: happy path sets new status + timestamp
- Test: calling the transition from an invalid prior state throws `InvalidOperationException`
- Use `TimeProvider.System` directly (no mocking needed)

```csharp
using FluentAssertions;
using StarterKit.Data.{Module}.Models;
using StarterKit.Data.{Module}.Enums;

namespace StarterKit.Data.Tests.{Module}.Models;

public abstract class {Entity}DomainTests
{
    protected static {Entity} Create{Entity}() =>
        new()
        {
            Id = Guid.NewGuid(),
            // {initialize all required properties with sensible defaults}
            CreatedAt = DateTime.UtcNow,
        };

    public sealed class {Transition} : {Entity}DomainTests
    {
        [Fact]
        public void {Transition}_WhenIn{RequiredStatus}_Sets{NewStatus}AndTimestamp()
        {
            var entity = Create{Entity}(); // already in {RequiredStatus}

            entity.{Transition}(TimeProvider.System);

            entity.Status.Should().Be({StatusEnum}.{NewStatus});
            entity.{TimestampProperty}.Should().NotBeNull();
        }

        [Fact]
        public void {Transition}_WhenNotIn{RequiredStatus}_ThrowsInvalidOperationException()
        {
            var entity = Create{Entity}();
            entity.{PriorTransition}(TimeProvider.System); // move to a non-{RequiredStatus} state

            var act = () => entity.{Transition}(TimeProvider.System);

            act.Should().Throw<InvalidOperationException>();
        }
    }
}
```

If `HasStateMachine = false`, skip this file entirely and note the omission in the summary table.

---

### File 7 — Repository tests
**Path:** `apps/backend/tests/StarterKit.Data.Tests/{Module}/Repositories/{Entity}RepositoryTests.cs`

```csharp
using Bogus;
using FluentAssertions;
using StarterKit.Data.{Module}.Models;
using StarterKit.Data.{Module}.Repositories;
using StarterKit.Data.Postgres;
using Microsoft.EntityFrameworkCore;

namespace StarterKit.Data.Tests.{Module}.Repositories;

public abstract class {Entity}RepositoryTests : IDisposable
{
    protected readonly AppDbContext DbContext;
    protected readonly {Entity}Repository Sut;
    protected static readonly Faker Faker = new();

    // If the entity has FK dependencies, seed them in the constructor:
    // protected readonly Guid Existing{RelatedEntity}Id;

    protected {Entity}RepositoryTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        DbContext = new AppDbContext(options);
        Sut = new {Entity}Repository(DbContext);

        // Seed any FK dependencies, e.g.:
        // Existing{RelatedEntity}Id = Guid.NewGuid();
        // DbContext.{RelatedEntities}.Add(new {RelatedEntity} { Id = Existing{RelatedEntity}Id, ... });
        // DbContext.SaveChanges();
    }

    public void Dispose() => DbContext.Dispose();

    protected {Entity} Build{Entity}() =>
        new()
        {
            Id = Guid.NewGuid(),
            // {initialize with Faker data where appropriate}
            // {RelatedEntity}Id = Existing{RelatedEntity}Id,
            CreatedAt = DateTime.UtcNow,
        };

    public sealed class AddAsync : {Entity}RepositoryTests
    {
        [Fact]
        public async Task AddAsync_WithValid{Entity}_PersistsToDatabase()
        {
            var entity = Build{Entity}();

            await Sut.AddAsync(entity);

            var result = await DbContext.{Entities}.FindAsync(entity.Id);
            result.Should().NotBeNull();
            result!.Id.Should().Be(entity.Id);
        }
    }

    public sealed class FindByIdAsync : {Entity}RepositoryTests
    {
        [Fact]
        public async Task FindByIdAsync_WhenExists_Returns{Entity}()
        {
            var entity = Build{Entity}();
            await Sut.AddAsync(entity);

            var result = await Sut.FindByIdAsync(entity.Id);

            result.Should().NotBeNull();
            result!.Id.Should().Be(entity.Id);
        }

        [Fact]
        public async Task FindByIdAsync_WhenNotFound_ReturnsNull()
        {
            var result = await Sut.FindByIdAsync(Guid.NewGuid());

            result.Should().BeNull();
        }
    }

    public sealed class GetAsync : {Entity}RepositoryTests
    {
        [Fact]
        public async Task GetAsync_WhenExists_Returns{Entity}()
        {
            var entity = Build{Entity}();
            await Sut.AddAsync(entity);

            var result = await Sut.GetAsync(entity.Id);

            result.Id.Should().Be(entity.Id);
        }

        [Fact]
        public async Task GetAsync_WhenNotFound_ThrowsInvalidOperationException()
        {
            var act = async () => await Sut.GetAsync(Guid.NewGuid());

            await act.Should().ThrowAsync<InvalidOperationException>();
        }
    }

    public sealed class UpdateAsync : {Entity}RepositoryTests
    {
        [Fact]
        public async Task UpdateAsync_Changed{Property}_PersistsChange()
        {
            var entity = Build{Entity}();
            await Sut.AddAsync(entity);

            // Pick the first non-PK, non-FK, non-timestamp mutable property from the entity
            // definition and assign a new realistic value using Faker, then assert the
            // persisted value equals the updated value.  Never leave this as a comment.
            entity.{Property} = Faker.{FakerMethod}();
            await Sut.UpdateAsync(entity);

            var result = await Sut.FindByIdAsync(entity.Id);
            result!.{Property}.Should().Be(entity.{Property});
        }
    }

    public sealed class DeleteAsync : {Entity}RepositoryTests
    {
        [Fact]
        public async Task DeleteAsync_WhenExists_RemovesFromDatabase()
        {
            var entity = Build{Entity}();
            await Sut.AddAsync(entity);

            await Sut.DeleteAsync(entity.Id);

            var result = await Sut.FindByIdAsync(entity.Id);
            result.Should().BeNull();
        }

        [Fact]
        public async Task DeleteAsync_WhenNotFound_ThrowsInvalidOperationException()
        {
            var act = async () => await Sut.DeleteAsync(Guid.NewGuid());

            await act.Should().ThrowAsync<InvalidOperationException>();
        }
    }
}
```

**Rules:**
- Each test class gets its own InMemory database (`Guid.NewGuid().ToString()` as DB name)
- `IDisposable` always present — disposes `DbContext` after each test class
- `Sut` is always the field name for the system under test
- Seed FK dependencies in the constructor, not inline in each test
- Use `Faker` (Bogus) for realistic test data — never hardcode strings or `Guid.Empty`
- Assertions use `FluentAssertions` — never bare `Assert.Equal`
- Use explicit FluentAssertions patterns: `Should().NotBeNull()`, `Should().BeNull()`, `Should().Be(...)`, `Should().BeTrue()`, `Should().BeFalse()` as appropriate for the asserted value

---

## Step 3 — Verify the output

After writing all files:

1. **Check for compile issues** — ensure all `using` directives are correct and namespaces match folder paths
2. **Check AppDbContext** — confirm the `DbSet<{Entity}>` property was added
3. **Check the EF config** — confirm `{Entity}Config` is `internal sealed` and uses the correct table name

---

## Step 4 — Print the scaffolding summary

Print a table listing every file created or modified:

```
## Scaffolding complete for `{Entity}`

### Files created
| File | Description |
|---|---|
| `apps/backend/src/StarterKit.Data/{Module}/Models/{Entity}.cs` | Domain model |
| `apps/backend/src/StarterKit.Data/{Module}/Configurations/{Entity}Config.cs` | EF Core Fluent API configuration |
| `apps/backend/src/StarterKit.Data/{Module}/Interfaces/Repositories/I{Entity}Repository.cs` | Repository interface |
| `apps/backend/src/StarterKit.Data/{Module}/Repositories/{Entity}Repository.cs` | Repository implementation |
| `apps/backend/tests/StarterKit.Data.Tests/{Module}/Models/{Entity}SchemaTests.cs` | EF Core schema / property tests (always generated) |
| `apps/backend/tests/StarterKit.Data.Tests/{Module}/Models/{Entity}DomainTests.cs` | State-machine / lifecycle tests (only when `HasStateMachine = true`) |
| `apps/backend/tests/StarterKit.Data.Tests/{Module}/Repositories/{Entity}RepositoryTests.cs` | Repository tests |

### Files modified
| File | Change |
|---|---|
| `apps/backend/src/StarterKit.Data/Persistence/AppDbContext.cs` | Added `DbSet<{Entity}> {Entities}` |

### Next steps
1. **Create the EF migration:**
   ```bash
   cd apps/backend
   dotnet ef migrations add Add{Entity} --project src/StarterKit.Data --startup-project src/StarterKit.MobileApi
   ```
2. **Verify the migration** — open the generated migration file and confirm `Up()` contains the expected `CreateTable` SQL. If `Up()` is empty, delete the migration with `dotnet ef migrations remove` and resolve the cause (snapshot drift, missing `IEntityTypeConfiguration`).
3. **Build to confirm no compile errors:**
   ```bash
   dotnet build
   ```
4. **Run the new tests:**
   ```bash
   dotnet test tests/StarterKit.Data.Tests
   ```
5. **Register the repository** in the appropriate `ServiceCollectionExtensions.cs` (e.g. `StarterKit.Data/Extensions/ServiceCollectionExtensions.cs`) so it is available for DI:
   ```csharp
   services.AddScoped<I{Entity}Repository, {Entity}Repository>();
   ```
```

---

## Conventions quick reference

| Convention | Rule |
|---|---|
| Namespaces | Match folder path exactly: `StarterKit.Data.{Module}.Models` |
| Enums | Always in `StarterKit.Data/{Module}/Enums/` with explicit `int` values |
| EF enum storage | `int` (default) — never `HasConversion<string>()` |
| Repository interface location | `StarterKit.Data` (never `StarterKit.Core`) |
| `DeleteAsync` | Always throws via `GetAsync` if entity missing — no silent null check |
| `FindByIdAsync` | Returns `T?` — uses `FindAsync([id])` (EF identity map; idiomatic PK lookup) |
| `GetAsync` | Returns `T` — throws `InvalidOperationException` via `DbSetExtensions.GetAsync` |
| Timestamps | Use `clock.Now()` (from `StarterKit.Data.Extensions`) — never `GetUtcNow()` directly |
| Test DB isolation | `Guid.NewGuid().ToString()` as InMemory DB name — never a shared name |
| Test SUT field | Always named `Sut` — never `_sut`, `sut`, or the type name |
| Test assertions | FluentAssertions — never bare `Assert.Equal` |
| Test data | Bogus `Faker` — never hardcoded strings or `Guid.Empty` |
| File-scoped namespaces | Always — never block-scoped `namespace X { }` |

---

## Example usage

**User prompt:**
> Scaffold a `QuizAttempt` entity in the AI module with these properties:
> - `Id` Guid required
> - `QuizId` Guid required FK → Quiz
> - `UserId` string required max 128
> - `Score` int required
> - `CompletedAt` DateTime? nullable
> - `CreatedAt` DateTime required

**What Claude will generate:**
1. `StarterKit.Data/AI/Models/QuizAttempt.cs` — model class with nav property to Quiz
2. `StarterKit.Data/AI/Configurations/QuizAttemptConfig.cs` — EF config with `ToTable("QuizAttempts")`, FK, string max length
3. `StarterKit.Data/AI/Interfaces/Repositories/IQuizAttemptRepository.cs` — interface
4. `StarterKit.Data/AI/Repositories/QuizAttemptRepository.cs` — implementation
5. `AppDbContext.cs` updated — `public DbSet<QuizAttempt> QuizAttempts => Set<QuizAttempt>();`
6. `tests/StarterKit.Data.Tests/AI/Models/QuizAttemptSchemaTests.cs` — EF schema / property tests (always generated; no state machine → no DomainTests.cs)
7. `tests/StarterKit.Data.Tests/AI/Repositories/QuizAttemptRepositoryTests.cs` — full CRUD tests seeding a Quiz FK dependency
