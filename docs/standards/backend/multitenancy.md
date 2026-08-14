# Backend Multitenancy — The Law

Load this file when: adding a new entity with tenant scope, adding a new controller that serves club-scoped data, working with EF Core global query filters, or implementing impersonation.

---

## EF Core Global Query Filters

All queries against tenant-scoped entities are automatically filtered to the current tenant's `ClubId` via EF Core's global query filters.

### Tenant-Scoped Entities

The following entities carry `ClubId` and are filtered automatically:

| Entity | Table |
|---|---|
| `AiGameResult` | `AiGameResults` |
| `AiContentResult` | `AiContentResults` |
| `CreditLedgerEntry` | `CreditsLedger` |
| `UserEntity` | `Users` |
| `UserRoleAssignmentEntity` | `UserRoleAssignments` |
| `CheckIn` | `CheckIns` |
| `CheckInConfig` | `CheckInConfigs` |

When you add a **new entity** with a `ClubId` column, you **must** add a `HasQueryFilter` call for it in `AppDbContext.ApplyMultitenancyFilters`.

### How the Filter is Wired

```text
ICurrentSession   (StarterKit.Core)
      ↓
CurrentTenantContext  (StarterKit.Auth) — implements ITenantContext
      ↓
ITenantContext  (StarterKit.Data/Postgres)
      ↓
AppDbContext.ApplyMultitenancyFilters
```

`StarterKit.Data` cannot reference `StarterKit.Core` (circular dependency). `ITenantContext` is therefore defined in `StarterKit.Data/Persistence/` so `AppDbContext` can consume it without breaking the dependency graph.

### Filter Logic

```csharp
// AppDbContext — filter applied to every entity with ClubId
.HasQueryFilter(e => !_tenantContext.IsActive || e.ClubId == _tenantContext.ClubId)
```

| `IsActive` | Effect |
|---|---|
| `false` (background job, unauthenticated request, migrator, test) | All rows visible — filter bypassed |
| `true` (authenticated HTTP request) | Only rows for the current `ClubId` are returned |

### `NullTenantContext` — Null-Object Pattern

`AppDbContext` accepts `ITenantContext?` but immediately falls back to `NullTenantContext.Instance` (`IsActive = false`) when `null` is passed. This covers:

- Design-time migration factory (`AppDbContextFactory`) — calls `new AppDbContext(options)` with no DI
- Hangfire background job scopes — no `HttpContext` → `IsAuthenticated = false` → `IsActive = false`
- All existing unit/integration tests that construct `AppDbContext` directly

Do **not** inject `null` or construct `AppDbContext` without a tenant context and then rely on the null-object fallback for production code paths — always let the DI container provide `ITenantContext` via `AddStarterKitAuth()`.

### Cross-Tenant Access — `IgnoreQueryFilters`

Background processors, admin operations, and seed code that legitimately need cross-tenant access **must** explicitly call `.IgnoreQueryFilters()` and document why:

```csharp
// VIOLATION: relying on implicit filter bypass without documentation
var result = await _dbContext.AiGameResults.FindAsync(resultId, ct);
// ← not obvious why cross-tenant access is expected

// CORRECT: explicit bypass with a comment
var result = await _dbContext
    .AiGameResults
    .IgnoreQueryFilters()  // Hangfire processor — processes jobs from all tenants
    .FirstOrDefaultAsync(x => x.Id == resultId, ct);
```

---

## `[AllowImpersonation]` Attribute

`ImpersonationMiddleware` allows SuperAdmins to scope a request to a specific club by sending `X-Impersonate-Club` / `X-Impersonate-Team` headers. However, the middleware **only injects impersonation claims when the matched endpoint is decorated with `[AllowImpersonation]`**. Endpoints without the attribute always run with cross-tenant access (EF Core filter disabled), even if headers are present in the request.

### Rule — Opt-In on Tenant-Scoped Controllers

Apply `[AllowImpersonation]` at the **controller class level** on every controller that serves club-scoped data (e.g. Users, Games, Topics, Questions, Tags, AI generation). Do **not** apply it to platform-admin controllers that must see all tenants (Clubs, Teams, Roles).

```csharp
// CORRECT — tenant-scoped controller opts in
[ApiController]
[AllowImpersonation]
[Route("api/users")]
public sealed class UsersController : ControllerBase { ... }

// CORRECT — cross-tenant admin controller has NO attribute
[ApiController]
[Route("api/clubs")]
public sealed class ClubsController : ControllerBase { ... }
```

### Attribute Location

`StarterKit.Auth.Attributes.AllowImpersonationAttribute` — a `GlobalUsings.cs` in `StarterKit.WebApi` re-exports it project-wide so controllers do not need an explicit `using` statement.

### Frontend Behaviour

The frontend sends `X-Impersonate-*` headers on **every** request when a workspace is active. The backend's attribute is the sole gate; no frontend URL exclusion lists are required.

### Adding a New Tenant-Scoped Controller

When you scaffold a new controller whose queries touch tenant-scoped entities:

1. Add `[AllowImpersonation]` to the controller class
2. Add a `HasQueryFilter` for any new entity (see below)

```csharp
// VIOLATION: new controller queries Users (tenant-scoped) but is missing the attribute
[ApiController]
[Route("api/leaderboards")]
public sealed class LeaderboardController : ControllerBase { ... }
// ← SuperAdmin impersonating a club will see all-tenant data (filter bypassed)

// CORRECT
[ApiController]
[AllowImpersonation]
[Route("api/leaderboards")]
public sealed class LeaderboardController : ControllerBase { ... }
```

---

## Adding a New Tenant-Scoped Entity

1. Add `ClubId` to the entity model
2. Add `HasQueryFilter` in `AppDbContext.ApplyMultitenancyFilters`:

   ```csharp
   modelBuilder
       .Entity<NewTenantEntity>()
       .HasQueryFilter(e =>
           !_tenantContext.IsActive || e.ClubId == _tenantContext.ClubId);
   ```

3. Add a test in `MultitenancyIsolationTests` asserting two-tenant isolation
4. Ensure any cross-tenant repository queries (e.g. background processors) call `.IgnoreQueryFilters()`

```csharp
// VIOLATION: new entity with ClubId but no HasQueryFilter
public class NewTenantEntity { public Guid ClubId { get; set; } ... }
// ← AppDbContext.ApplyMultitenancyFilters not updated → cross-tenant leak
```
