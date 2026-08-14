# Backend Structure — The Law

Folder layouts for all four projects. Load this file when: adding a new module, moving files, or scaffolding a new feature. For specific layer rules see the sibling files in `docs/standards/backend/`.

---

## StarterKit.Data Folder Structure

`StarterKit.Data` owns everything EF Core touches: domain models, EF configurations, migrations, repository interfaces, and repository implementations. Because `StarterKit.Data` has no project references (it cannot reference `StarterKit.Core`), repository interfaces **must** live here so that implementations in the same project can reference them. `StarterKit.Core` sees them via its own reference to `StarterKit.Data`.

```text
StarterKit.Data/<Module>/
    Models/             ← domain entities (AiJob, AiJobLog, etc.)
    Enums/              ← ALL enums for Data-layer types (AiJobStatus, AiJobLogLevel, etc.)
    Configurations/     ← EF Core IEntityTypeConfiguration<T> classes
    Interfaces/
        Repositories/   ← IAiJobRepository, IJobTypeRepository etc.
    Repositories/       ← repository implementations
Migrations/             ← EF Core migration files (project root level)
Postgres/               ← AppDbContext, AppDbContextFactory
Extensions/             ← internal DbSet extension methods (e.g. DbSetExtensions)
```

**Violations — never do this:**

```csharp
// VIOLATION: repository interface defined in StarterKit.Core
// StarterKit.Core/AI/Interfaces/Repositories/IAiJobRepository.cs
// ← StarterKit.Data cannot reference StarterKit.Core — circular dependency
// ← belongs in StarterKit.Data/AI/Interfaces/Repositories/

// VIOLATION: repository implementation referencing StarterKit.Core namespace
using StarterKit.Core.AI.Interfaces.Repositories; // ← will not compile in StarterKit.Data
// ← use: using StarterKit.Data.AI.Interfaces.Repositories;

// VIOLATION: domain model defined in StarterKit.Core
StarterKit.Core.AI.Models.AiJob   // ← models belong in StarterKit.Data (Core references Data, not vice versa)
```

---

## StarterKit.Core Folder Structure

All code inside `StarterKit.Core` (including sub-modules like `AI/`) **must** follow this folder structure. Any new sub-module added to `StarterKit.Core` must mirror this layout:

```text
StarterKit.Core/<Module>/
    Enums/              ← ALL enums — no exceptions; never put enums inside domain folders
    Interfaces/
        Services/       ← IUserService, IAiJobService etc
        <Domain>/       ← all other interfaces grouped by domain, mirroring the impl folder
                           e.g. Interfaces/Guardrails/, Interfaces/Handlers/, Interfaces/Providers/
    Services/           ← service implementations
    DTOs/               ← request/response objects
    Helpers/            ← shared helper / utility classes (stateless, no domain logic)
    Exceptions/         ← domain-specific exceptions
    Extensions/         ← e.g. ServiceCollectionExtensions.cs
    Options/            ← {Section}Options classes for the Options pattern
```

Note: repository interfaces are **not** in `StarterKit.Core` — they live in
`StarterKit.Data/<Module>/Interfaces/Repositories/`. See StarterKit.Data Folder Structure above.

The `AI/` sub-module is the canonical reference implementation of this structure. Its
domain-specific folders (`Factories/`, `Guardrails/`, `Handlers/`, `Messaging/`, `Prompts/`,
`Providers/`, `Schema/`) each have a matching sub-folder under `Interfaces/` that holds only
the contracts — implementations live in the domain folder, interfaces live in `Interfaces/<Domain>/`.

**Violations — never do this:**

```csharp
// VIOLATION: enum inside a domain folder
StarterKit.Core.AI.Difficulty.QuestionDifficulty      // ← belongs in AI/Enums/

// VIOLATION: interface co-located with its implementation
StarterKit.Core.AI.Guardrails.IGuardrailProvider      // ← belongs in AI/Interfaces/Guardrails/

// VIOLATION: repository interface placed in StarterKit.Core
StarterKit.Core.AI.Interfaces.Repositories.IAiJobRepository  // ← belongs in StarterKit.Data/AI/Interfaces/Repositories/

// VIOLATION: service interface outside Interfaces/Services/
StarterKit.Core.AI.Services.IAiJobService             // ← belongs in AI/Interfaces/Services/

// VIOLATION: domain models folder named "Entities"
StarterKit.Core.AI.Entities.AiJob                     // ← models belong in StarterKit.Data/AI/Models/

// VIOLATION: helper class buried inside a domain folder
StarterKit.Core.AI.Guardrails.GuardrailHelpers        // ← belongs in AI/Helpers/
```

---

## StarterKit.MobileApi / StarterKit.WebApi Folder Structure

All code inside `StarterKit.MobileApi` and `StarterKit.WebApi` **must** follow this folder structure per domain module. The `AI/` module is the canonical reference implementation.

```text
StarterKit.MobileApi/<Module>/
    Interfaces/     ← controller contracts (e.g. IAiJobsController)
    DTOs/           ← HTTP request/response shapes (never shared with Core)
    Mcp/            ← <X>McpTools.cs — MCP tool class mirroring the controller (see mcp.md)
    <Controller>.cs ← thin controller implementing the Interfaces/ contract
```

### Controller contract rule

Every controller **must** implement an interface from its `Interfaces/` folder.
The interface method names **must** match the corresponding `IAiJobService` method names —
this enforces a 1:1 mapping between service methods and HTTP endpoints at compile time.

```csharp
// StarterKit.MobileApi/AI/Interfaces/IAiJobsController.cs
public interface IAiJobsController
{
    Task<ActionResult<AiGenerateResponseDto>> GenerateQuizAsync(
        GenerateQuizRequestDto request,
        CancellationToken cancellationToken
    );
}

// StarterKit.MobileApi/AI/AiJobsController.cs
public sealed class AiJobsController : ControllerBase, IAiJobsController
{
    // compiler enforces GenerateQuizAsync must exist and match the signature
}
```

**Violations — never do this:**

```csharp
// VIOLATION: interface co-located with the controller
StarterKit.MobileApi.AI.IAiJobsController   // ← belongs in AI/Interfaces/

// VIOLATION: HTTP DTO defined in Core
StarterKit.Core.AI.DTOs.AiGenerateResponseDto  // ← HTTP shapes belong in MobileApi/AI/DTOs/

// VIOLATION: controller not implementing its interface contract
public sealed class AiJobsController : ControllerBase  // ← must also implement IAiJobsController
```

### Controllers must not do entity existence checks

Controllers **must not** call `FindByIdAsync` to validate that a parent or related entity exists before delegating to a service. Existence validation belongs in the service layer. When a required entity is missing the service throws `EntityNotFoundException`; the exception middleware maps this to `404 Not Found` automatically.

```csharp
// VIOLATION: controller checking parent entity existence
var topic = await topicService.FindByIdAsync(topicId, cancellationToken);
if (topic is null)
    return NotFound();
await companyTopicService.AssignTopicAsync(companyId, topicId, cancellationToken);

// CORRECT: service validates the parent and throws EntityNotFoundException if missing
await companyTopicService.AssignTopicAsync(companyId, topicId, cancellationToken);
```

### Controllers must not own pagination clamping

Page/pageSize clamping belongs in the service layer. Controllers must pass raw values from the query string directly to the service without applying `Math.Max`, `Math.Clamp`, or hardcoded magic numbers. Use `PagingConstants.DefaultPage` and `PagingConstants.DefaultPageSize` for parameter defaults.

```csharp
// VIOLATION: clamping in the controller
var result = await service.ListAsync(topicId, Math.Max(1, page), Math.Clamp(pageSize, 1, 100), cancellationToken);

// CORRECT: raw values passed through; service clamps internally
[FromQuery] int page = PagingConstants.DefaultPage,
[FromQuery] int pageSize = PagingConstants.DefaultPageSize,
...
var result = await service.ListAsync(topicId, page, pageSize, cancellationToken: cancellationToken);
```

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Controllers | `PascalCase` + `Controller` suffix | `UsersController` |
| Service interfaces | `I` prefix + `PascalCase` + `Service` | `IUserService` |
| Repository interfaces | `I` prefix + `PascalCase` + `Repository` | `IUserRepository` |
| DTOs | `PascalCase` + `Dto` suffix | `CreateUserDto`, `UserDto` |
| Domain exceptions | `PascalCase` + `Exception` suffix | `AiJobTimeoutException` |
| Test classes | mirrors production class + `Tests` suffix | `UserServiceTests` |
| Test methods | `MethodName_Condition_ExpectedResult` | `CreateUser_WhenEmailExists_ReturnsConflict` |
| Provider creators | `{ProviderName}ProviderCreator` | `AzureOpenAIProviderCreator` |

---

## Seed Data Conventions

Seed data lives in **EF Core migrations** (`StarterKit.Data/Migrations/`) — never in application startup code or a dedicated seeder class.

**Rules:**

- **Never hardcode GUIDs** in migration seed data — always use `Guid.NewGuid()` so IDs are unpredictable and don't collide across environments
- Add seed data via `migrationBuilder.InsertData(...)` inside a dedicated migration's `Up()` — and remove it in `Down()`
- Any new seed data must be added as a new migration, not by editing existing ones
- Do not add application startup seeders — if test data is needed locally, create it manually via SQL or the API

```csharp
// VIOLATION: hardcoded GUID in seed data
migrationBuilder.InsertData(
    table: "Companies",
    columns: new[] { "Id", "Name" },
    values: new object[] { new Guid("11111111-0000-0000-0000-000000000001"), "Demo Company" }
);

// CORRECT: seed via migration with unpredictable IDs
migrationBuilder.InsertData(
    table: "Companies",
    columns: new[] { "Id", "Name" },
    values: new object[] { Guid.NewGuid(), "Demo Company" }
);
```
