# Architecture

## Overview

StarterKit Mobile is a cross-platform app built on Expo's managed workflow. It targets iOS, Android, and Web from a single TypeScript codebase. The architecture follows **Clean Architecture** with **feature-based vertical slices**.

## Stack

| Layer | Technology | Why |
|---|---|---|
| Runtime | Expo SDK 54 + React Native 0.81 | Managed workflow, OTA updates, unified cross-platform APIs |
| Language | TypeScript (strict) | Type safety, better DX, self-documenting code |
| Routing | Expo Router v6 | File-based routing, deep linking, web URL support |
| Styling | Uniwind v1.5 + Tailwind CSS v4 | Utility-first, CSS-first tokens, no runtime overhead |
| HTTP | Axios (singleton) + React Query | Interceptors, caching, background refetch |
| State | Zustand (client) + React Query (server) | Minimal boilerplate, external access for interceptors |
| Storage | expo-secure-store (sensitive) + react-native-mmkv (fast KV) | Tokens in secure storage, preferences in MMKV |
| Forms | react-hook-form + Zod | Declarative validation, no re-renders |
| Testing | Vitest + RNTL + MSW | Fast unit/integration tests, HTTP mocking |
| Linting | Biome | Single tool for lint + format, faster than ESLint+Prettier |
| Animations | React Native Reanimated v4 | Native thread animations, gesture integration |

See `docs/adr/` for reasoning behind each major decision.

## Directory Structure

```text
app/                     # Expo Router — routing shells ONLY (no logic)
  _layout.tsx            # Root layout (providers: QueryClient, ErrorBoundary)
  (tabs)/                # Tab group
    _layout.tsx          # Tab bar layout
    index.tsx            # Home tab
    explore.tsx          # Explore tab
components/
  ui/                    # Design system primitives (CVA variants + cn())
    button.tsx           # Button — 5 variants × 3 sizes + fullWidth + loading
    input.tsx            # Input — label, error, hint, focus/disabled states
    form-field.tsx       # FormField — RHF Controller wrapper for Input
    alert.tsx            # Alert — error/warning/info/success variants
    typography.tsx       # Typography — h1–h4, body, body-sm, label, caption
    icon.tsx             # Icon — SF Symbols / Material Icons
    index.ts             # Barrel export
constants/
  tokens.ts              # Design tokens — runtime access (self-contained)
  theme.ts               # React Navigation theme derived from tokens
src/
  features/              # Bounded contexts (vertical slices)
    auth/                # Auth feature (canonical reference implementation)
      domain/            # Pure TS — entities, VOs, failures, repo interfaces
      infrastructure/    # HTTP datasources, repo impls, mappers, DTOs
      application/       # Services, use cases
      presentation/      # Screens, hooks, components (React only)
  lib/
    cn.ts                # cn() — class merger (clsx + tailwind-merge)
    http/                # api-client.ts, api-error.ts, query-client.ts
    storage/             # secure-storage.ts, mmkv-storage.ts
  proxy/                 # AUTO-GENERATED — Orval output (never hand-edit)
    models/              # TypeScript DTOs, enums, request/response types
    services/            # Axios functions grouped by controller tag
  store/                 # Zustand global stores
    auth-store.ts        # User, tokens, isAuthenticated, isHydrated
    app-store.ts         # Color scheme, onboarding (persisted via MMKV)
openapi/                 # Committed OpenAPI schemas (source of truth for proxy)
  mobile-api.json        # From StarterKit.MobileApi
test/                    # Shared test infrastructure
  setup.ts               # Global setup — MSW lifecycle, RN mocks, MMKV mock
  factories/             # Shared test factories (makeUser, makeTokens, etc.)
  mocks/                 # MSW handlers and server
__tests__/               # Tests mirroring src/ structure 1:1
docs/                    # Project documentation
  adr/                   # Architecture Decision Records
spec/                    # Feature specifications (Spec-Driven Workflow)
```

## Data Flow

```text
External APIs
     │
     ▼
  DataSource (infrastructure — raw HTTP via apiClient)
     │
     ▼
  Mapper (DTO → Domain Entity)
     │
     ▼
  Repository (implements domain interface)
     │
     ▼
  Service / Use Case (application — orchestration, error translation)
     │
     ▼
  Hook (presentation — useQuery/useMutation, composes dependency chain)
     │
     ▼
  Screen (presentation — renders UI with shared components)
```

- DataSources make HTTP calls via the shared `apiClient` singleton
- Mappers convert snake_case DTOs to domain entities (pure functions)
- Services translate `ApiError` into domain `Failure` types
- Hooks compose the full dependency chain (DataSource → Repo → Service → UseCase)
- Screens are thin — they call hooks and render `components/ui/` primitives

## Dependency Rule

Dependencies flow **inward only** — never outward:

```text
presentation → application → domain
infrastructure             → domain
```

| Layer | Knows about | Never imports from |
|---|---|---|
| `domain/` | Nothing (pure TS) | All other layers |
| `infrastructure/` | Domain interfaces, `@lib/` | Application, Presentation |
| `application/` | Domain only | Infrastructure, Presentation |
| `presentation/` | Application use-cases, Domain failures | Infrastructure |

## State Management

Two categories, managed by different tools:

| Category | Tool | Example |
|---|---|---|
| Server state | React Query | User profile, game lists, API data |
| Client state | Zustand | Auth session, color scheme, onboarding |
| Component state | `useState` | Form inputs, toggles, local UI |
| Form state | react-hook-form + Zod | Login form, registration form |

**Rules:**

- Server data lives in React Query's cache — never duplicate in Zustand
- Zustand stores export both the hook (`useAuthStore`) and non-hook utils (`authStoreUtils`)
- Non-sensitive preferences are persisted to MMKV via Zustand's `persist` middleware
- Sensitive data (tokens) stored in expo-secure-store, managed by the auth repository

## HTTP Layer

A single `apiClient` axios instance handles all HTTP (see `src/lib/http/api-client.ts`):

- **Request interceptor**: attaches `Bearer` token from auth store (lazy `import()`)
- **Response interceptor**: catches 401 → attempts token refresh with queued retry → triggers logout on failure
- **Error normalisation**: all non-2xx responses become `ApiError` instances with status helpers

The token refresh flow uses a queue to prevent concurrent refresh races.

## Proxy Layer (Auto-Generated)

Typed TypeScript functions and DTOs are **auto-generated** from the backend OpenAPI schemas
using [Orval](https://orval.dev/). The generated code lives in `src/proxy/` and must never
be hand-edited.

- **Models** (`src/proxy/models/`): TypeScript interfaces, enums, and request/response types
- **Services** (`src/proxy/services/`): Axios functions grouped by controller tag
- All generated functions delegate to the shared `apiClient` via a custom mutator, so auth
  interceptors and error normalisation apply automatically

**Regeneration:** `npm run generate:proxy` (fetches schema + generates + formats).
See `docs/adr/005-openapi-proxy-generation.md` for full details.

## Storage Strategy

| Type | Store | Use |
|---|---|---|
| Auth tokens | expo-secure-store (`secureStorage`) | Encrypted at rest on device |
| App preferences | react-native-mmkv (`mmkvStorage`) | Fast KV, Zustand persist adapter |
| Server cache | React Query in-memory | Automatic via staleTime/gcTime |

## Routing

Expo Router uses the `app/` directory as the file system router. Pages are **routing shells only** — they import and re-export screens from `features/`:

```tsx
// app/auth/login.tsx
import { LoginScreen } from '@features/auth/presentation/screens/login-screen';
export default LoginScreen;
```

## Platform Strategy

Components are written once and run on all platforms. Platform-specific code is isolated:

1. **`.platform.tsx` suffixes** — for entirely different implementations per platform
2. **`Platform.select()`** — for small inline differences
3. **Platform-specific props** — e.g., `accessibilityRole` values differ between native and web

## Testing Strategy

- **Unit tests**: Domain entities, value objects, services, use cases, utilities
- **Integration tests**: Datasources against MSW mock server
- **Component tests**: render + interaction via `@testing-library/react-native`

Test infrastructure lives in `test/`:

- `test/setup.ts` — global setup (MSW lifecycle, RN/Expo mocks, MMKV mock)
- `test/factories/` — shared fixture factories (`makeUser`, `makeTokens`, `makeUserDto`, etc.)
- `test/mocks/` — MSW request handlers and server instance

Test files in `__tests__/` mirror the source path 1:1:

```text
src/features/auth/domain/entities/user.entity.ts
  → __tests__/src/features/auth/domain/entities/user.entity.test.ts
components/ui/button.tsx
  → __tests__/components/ui/button.test.ts
```

See `test/README.md` for full testing conventions.
