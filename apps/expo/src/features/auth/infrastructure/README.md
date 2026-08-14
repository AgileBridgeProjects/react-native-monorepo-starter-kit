# Infrastructure Layer — Auth

HTTP communication, token storage, and error translation.

## What lives here

| Folder | Contents |
|---|---|
| `datasources/` | `SupabaseAuthDatasource` — wraps the Supabase (GoTrue) auth methods via `@supabase/supabase-js`. Handles sign-in, registration, sign-out, OAuth (Google/Apple id-token) and Supabase error → domain `Failure` translation. |

## Rules

- The datasource is the repository. No separate `IAuthRepository` interface or `AuthRepositoryImpl` class.
- DTOs (wire-format types) live inside `auth.datasource.ts`. They never leave this layer.
- `ApiError` → domain `Failure` translation happens here, not in a service or hook.
- Token persistence (`secureStorage`) is owned by the datasource for auth flows.
- When the proxy is generated for `AuthController`, swap `apiClient` calls to proxy functions and delete the hand-written DTOs.

## Adding a new endpoint

1. Add a method to `SupabaseAuthDatasource` (in `packages/shared`).
2. Map Supabase `AuthError` codes → domain `Failure` classes in the shared error map.
3. Add a `vi.mock('@lib/supabase/config', ...)` handler in the datasource test.
