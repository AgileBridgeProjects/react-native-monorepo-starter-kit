# Infrastructure Layer — Auth

HTTP communication and error translation.

## What lives here

| Folder | Contents |
|---|---|
| `datasources/` | `AuthDataSource` — one method per backend `AuthController` endpoint. Handles HTTP calls via proxy or `apiClient`, inline DTO-to-type mapping, and `ApiError` → domain `Failure` translation. |

## Rules

- The datasource is the repository. No separate `IAuthRepository` interface or `AuthRepositoryImpl` class.
- DTOs live inside the datasource file or a sibling `*.dto.ts` — they never leave infrastructure.
- `ApiError` → domain `Failure` translation happens here, not in a hook.
- Use generated proxy functions from `src/proxy/` where available — do not call `apiClient` directly for endpoints that Orval already covers.

## Adding a new endpoint

1. Add a method to `AuthDataSource`.
2. Add the DTO interface inline or in a sibling `*.dto.ts` if it's large.
3. Handle `ApiError` → `Failure` translation inline in the method.
4. Add MSW handler in `test/mocks/handlers.ts` and add a datasource test.
