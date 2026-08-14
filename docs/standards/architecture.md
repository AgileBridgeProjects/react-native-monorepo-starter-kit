# Architecture — The Law

Code follows **feature-based vertical slices**. Each feature owns its entire stack from API to UI.

## Frontend dependency rule (never break this)

```text
Screen → Hook → Datasource → Proxy → apiClient
```

Every layer depends only on the layer directly below it.

## Frontend layer responsibilities

| Layer | What it does | Never imports from |
|---|---|---|
| `presentation/screens/` | Renders UI, composes hooks | Datasource directly |
| `presentation/hooks/` | `useQuery` / `useMutation` wrapping the datasource | Nothing below datasource |
| `infrastructure/datasources/` | HTTP calls via proxy or `apiClient`; error translation; token storage | Presentation |
| `domain/failures/` | Pure TS typed error classes | All other layers |

### When extra layers are earned

Simple API features (auth, rewards, CRUD) need only three layers: `failures/` + `datasources/` + hooks.

Complex features with genuine game-state logic (crossword, fill-in-the-blank, etc.) may add:

- `domain/entities/` — when an object has real computed behaviour or state (not just a DTO mirror)
- `application/services/` — when orchestration logic is complex enough to test in isolation

**The rule:** complexity earns layers. Do not add `IRepository`, `RepositoryImpl`, `UseCase`, or `Service` classes as boilerplate when the code is a straight pass-through.

## Backend dependency rule (never break this)

```text
StarterKit.MobileApi  ──┐
                    ├──▶  StarterKit.Core  ──▶  StarterKit.Data  ──▶  PostgreSQL
StarterKit.WebApi     ──┘
```

- API projects reference `StarterKit.Core` (plus the shared infrastructure libraries `StarterKit.Auth` and `StarterKit.Mcp`) — never `StarterKit.Data` directly
- `StarterKit.Core` references `StarterKit.Data` only — never the API projects
- `StarterKit.Data` has **no project references** — it only depends on NuGet packages (EF Core, etc.)
- Business logic lives in `StarterKit.Core` — never in controllers

## 1:1 Backend mirror rule

Every backend controller maps to one datasource:

```text
AuthController     →  AuthDataSource
RewardsController  →  RewardsDataSource
```

## `app/` is a routing shell only

Pages in `app/` do one thing: import and re-export a screen from `features/`:

```tsx
// app/auth/login.tsx
import { LoginScreen } from '@features/auth/presentation/screens/login-screen';
export default LoginScreen;
```

No logic, no hooks, no state in `app/` files — just re-exports.

## Mapper convention

Mappers translate across layer boundaries and live **in the datasource file** that needs them.
They are private module functions — never classes, never in a separate `mappers/` folder unless
the file grows beyond ~200 lines, in which case extract to a co-located `<feature>.mappers.ts`.

### Naming

| Direction | Name pattern | Example |
|---|---|---|
| External SDK type → domain entity | `to<Entity>(raw)` | `toUser(supabaseUser)` |
| HTTP DTO → domain entity | `to<Entity>(dto)` | `toCompany(dto)` |
| Domain entity → HTTP request body | `toDto(entity)` | `toDto(company)` |

### Error mappers — declarative map, not switch

Use a lookup object keyed by error code. Adding a new error = one line.

```ts
// ✅ correct — one line per new error
const SUPABASE_ERROR_MAP: Readonly<Record<string, SupabaseErrorFactory>> = {
  [SUPABASE_ERROR_INVALID_CREDENTIALS]: () => new InvalidCredentialsFailure(),
  [SUPABASE_ERROR_USER_ALREADY_EXISTS]: (e) => new EmailAlreadyInUseFailure(extractEmailFromError(e)),
};

function mapSupabaseError(error: unknown): Error {
  if (isSupabaseAuthError(error)) {
    const factory = SUPABASE_ERROR_MAP[error.code];
    return factory ? factory(error) : error;
  }
  return error instanceof Error ? error : new Error(String(error));
}

// ❌ wrong — switch requires 3 touch-points per new error
switch (error.code) {
  case SUPABASE_ERROR_INVALID_CREDENTIALS:
    return new InvalidCredentialsFailure();
  ...
}
```

### Entity mappers — plain functions

```ts
// ✅ correct — simple private function at the bottom of the datasource
function toCompany(dto: CompanyDto): Company {
  return {
    id: dto.id,
    name: dto.name,
    status: dto.status as CompanyStatus,
  };
}

// ❌ wrong — heavyweight class wrapper with no value
class CompanyMapper {
  static fromDto(dto: CompanyDto): Company { ... }
}
```

Never export mappers from a datasource — they are implementation details of that datasource.
