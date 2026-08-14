# ADR 003: HTTP Layer — Axios + React Query

**Date:** 2026-03-11
**Status:** Accepted

---

## Context

We need a consistent, DRY approach to HTTP that handles:

- Auth token injection on every request
- Automatic logout on 401
- Normalised errors (no raw `AxiosError` in business code)
- Caching, background refetch, and loading/error state for data fetching
- Retrying transient failures but not deterministic ones (404, 403)

---

## Decisions

### Axios for transport

**Chosen over:** native `fetch`, `ky`

Axios provides request/response interceptors as first-class features. Interceptors are the right place for cross-cutting concerns (auth headers, error normalisation, 401 logout). `fetch` requires wrapping manually; `ky` is hooks-based and doesn't integrate as cleanly with the singleton pattern.

A single `apiClient` instance is exported from `src/lib/http/api-client.ts`. All datasources use this instance — no feature creates its own axios instance.

**Interceptor lazy loading**: Interceptors use `import()` (not `require()`) for store and storage access. This avoids circular dependencies at module load time and is required by Vite for path alias resolution.

**Token refresh**: The response interceptor catches 401 errors and attempts a token refresh. A queue prevents concurrent refresh races — any requests that arrive during a refresh wait for the new token before retrying.

### ApiError for normalisation

All non-2xx responses are caught in the response interceptor and re-thrown as `ApiError` instances. Business code (services, use cases) never sees `AxiosError` or HTTP status codes. Status helpers (`isUnauthorized`, `isNotFound`, etc.) make branching clean.

### React Query for server state

**Chosen over:** manual `useState/useEffect` fetching, Redux Toolkit Query, SWR

React Query manages the entire server-data lifecycle: loading state, caching, background refetch, optimistic updates. This removes significant boilerplate from hooks.

Configuration in `src/lib/http/query-client.ts`:

- `staleTime: 5min` — data is fresh for 5 minutes
- Retry policy: no retry on 401/403/404 (deterministic); up to 2 retries for others
- `refetchOnWindowFocus: false` — irrelevant for mobile

### Zod for validation

API responses are validated at the form/input boundary using Zod schemas. This provides runtime type safety at the point where data enters the application.

---

## Error handling flow

```text
HTTP error
  → ApiError.fromAxiosError()  (interceptor)
  → AuthService catches ApiError(401) → throws InvalidCredentialsFailure
  → useLogin hook catches InvalidCredentialsFailure → shows user message
```

The presentation layer only ever catches domain failures — never raw HTTP errors.

---

## Consequences

- All datasources must import `apiClient` from `@lib/http/api-client`
- New HTTP errors should be added as getters to `ApiError`
- Services must translate `ApiError` instances to domain failures before re-throwing
- The `queryClient` is provided to the app via `QueryClientProvider` in `app/_layout.tsx`
