# Test Infrastructure

Shared testing utilities, mocks, and factories. Configured via `vitest.config.ts` with `test/setup.ts` as the global setup file.

## Directory Structure

```text
test/
  setup.ts             # Global setup — MSW lifecycle, RN/Expo/MMKV mocks
  factories/           # Shared fixture factories
    auth.factory.ts    # Auth: makeUser, makeTokens, makeUserDto, makeMockAuthRepo, etc.
    index.ts           # Barrel export
  mocks/               # MSW (Mock Service Worker)
    handlers.ts        # Request handlers for all API endpoints
    server.ts          # MSW server instance (setupServer)
```

Tests themselves live in `__tests__/`, mirroring source paths 1:1.

---

## Factories (`test/factories/`)

All test fixtures are built with factory functions. **Never create inline fixtures** — import from `test/factories/`.

### Available factories

| Factory | Returns | Use for |
|---|---|---|
| `makeUser(overrides?)` | `User` entity | Domain/service/store tests |
| `makeTokens(overrides?)` | `AuthTokens` | Service/store tests |
| `makeUserDto(overrides?)` | `AuthUserDto` | Mapper/datasource/MSW tests |
| `makeAuthResponseDto(overrides?)` | `AuthResponseDto` | Mapper/datasource/MSW tests |
| `makeRefreshResponseDto(overrides?)` | `RefreshResponseDto` | Datasource/MSW tests |
| `makeMockAuthRepo(overrides?)` | `IAuthRepository` (mocked) | Service tests |
| `makeMockAuthService(overrides?)` | Partial `AuthService` (mocked) | Use-case tests |

### Creating a new factory

1. Add the factory to the appropriate file (e.g., `auth.factory.ts`) or create a new `<feature>.factory.ts`.
2. Use the `Partial<T>` overrides pattern:

   ```ts
   export function makeThing(overrides: Partial<ThingProps> = {}): Thing {
     return new Thing({ id: '1', name: 'Default', ...overrides });
   }
   ```

3. Export from `test/factories/index.ts`.

---

## MSW (`test/mocks/`)

[Mock Service Worker](https://mswjs.io/) intercepts HTTP at the network level, so datasource tests exercise real axios ↔ HTTP logic without hitting a real server.

### `handlers.ts`

Contains default handlers for all API endpoints. Handlers use factory fixtures:

```ts
import { makeAuthResponseDto } from '../factories';

export const mockAuthResponse = makeAuthResponseDto();

http.post(`${BASE_URL}/auth/login`, () => HttpResponse.json(mockAuthResponse));
```

### `server.ts`

```ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
export const server = setupServer(...handlers);
```

### Per-test overrides

Override a handler for a specific test:

```ts
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

server.use(
  http.post('http://localhost:3000/auth/login', () =>
    HttpResponse.json({ message: 'Server error' }, { status: 500 })
  )
);
```

Overrides are automatically cleared after each test via `server.resetHandlers()` in `setup.ts`.

---

## Global Setup (`test/setup.ts`)

Runs before all tests in every file. Provides:

### MSW lifecycle

```ts
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Global mocks

| Module | Mock strategy |
|---|---|
| `react-native` | Minimal stubs (Platform, StyleSheet, primitives) |
| `expo-router` | Stub router, params, Link |
| `expo-haptics` | No-op stubs |
| `expo-secure-store` | In-memory store with `__reset` helper |
| `react-native-mmkv` | Class-based `MMKVMock` with per-instance isolation |

**Rule**: Never re-declare these mocks in individual test files. If you need to customise behaviour for a test, use `vi.mocked()` to modify the existing mock.

---

## Test Conventions

| Rule | Do | Don't |
|---|---|---|
| Test.(block) | `describe()` + `it()` | bare `test()` |
| Boolean assertions | `toBeTruthy()` / `toBeFalsy()` | `toBe(true)` / `toBe(false)` |
| Fixtures | Import from `test/factories/` | Define inline `makeUser()` per file |
| Mocking HTTP | MSW handlers in `test/mocks/` | `vi.mock('axios')` |
| Mocking boundaries | Mock the next layer inward | Mock deep internals |
| Global mocks | Use `test/setup.ts` | Re-declare per test file |
| Hook inputs | Keep fixture props stable across rerenders unless the test is about changing them | Create fresh objects inline on every render |

---

## Stable Hook Inputs

When testing hooks that reset or recompute from prop identity, keep the input fixture stable for the lifetime of the test unless the behavior under test is an intentional input change.

Good:

```ts
const crossword = makeCrosswordOutput();
const { result, rerender } = renderHook(() => useCrosswordPlayer(crossword));
```

Avoid:

```ts
const { result } = renderHook(() => useCrosswordPlayer(makeCrosswordOutput()));
```

Creating a fresh object on every render can accidentally trigger reset effects, produce flaky assertions, or cause rerender loops that look like memory leaks in Vitest.

---

## Adding Tests for a New Feature

1. Create `test/factories/<feature>.factory.ts` with domain + DTO factories.
2. Export all factories from `test/factories/index.ts`.
3. Add MSW handlers in `test/mocks/handlers.ts` using factory fixtures.
4. Create test files in `__tests__/src/features/<feature>/` mirroring the source structure.
