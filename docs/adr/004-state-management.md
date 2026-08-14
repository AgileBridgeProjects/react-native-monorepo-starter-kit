# ADR 004: State Management — Zustand + React Query

**Date:** 2026-03-11
**Status:** Accepted

---

## Context

Two categories of state exist in this app:

1. **Server state** — data that lives on the backend and is fetched asynchronously
2. **Client state** — UI preferences, auth session, in-memory data not tied to a server resource

These have different requirements and should be managed differently.

---

## Decisions

### React Query for server state

See ADR 003. React Query handles all server-fetched data: caching, synchronisation, background updates.

**Rule:** If data comes from an API, it lives in a React Query cache — not in Zustand.

### Zustand for client state

**Chosen over:** Redux, MobX, React Context + useReducer, Jotai

Zustand is minimal (< 1KB), has no boilerplate, and allows reading state outside React components (critical for the axios interceptor pattern). The `getState()` API enables `authStoreUtils.getAccessToken()` in the request interceptor without a circular import.

Current stores:

- `auth-store.ts` — `user`, `accessToken`, `isAuthenticated`, `isHydrated`
- `app-store.ts` — `colorScheme`, `isOnboarded` (persisted to MMKV)

### Persistence: react-native-mmkv

**Chosen over:** AsyncStorage, expo-file-system

MMKV is significantly faster than AsyncStorage (synchronous reads) and integrates cleanly with Zustand's `persist` middleware via a custom `StateStorage` adapter (`src/lib/storage/mmkv-storage.ts`).

```ts
import { mmkvStorage } from '@lib/storage/mmkv-storage';
import { createJSONStorage, persist } from 'zustand/middleware';

create<MyStore>()(persist(storeImpl, {
  name: 'store-name',
  storage: createJSONStorage(() => mmkvStorage),
}));
```

**Rule:** Only non-sensitive data goes in MMKV. Sensitive data (auth tokens) uses `secureStorage` (expo-secure-store).

### When NOT to use Zustand

- Feature-local UI state: use `useState` / `useReducer`
- Form state: use `react-hook-form`
- Derived state from server data: use React Query selectors (`select` option)

---

## Store conventions

```typescript
// Pattern: split State and Actions interfaces, then merge
interface AuthState { user: User | null; ... }
interface AuthActions { setAuth: (...) => void; logout: () => void; }
type AuthStore = AuthState & AuthActions;
export const useAuthStore = create<AuthStore>((set) => ({ ... }));
```

Non-hook utilities (for use in interceptors/services):

```typescript
export const authStoreUtils = {
  getAccessToken: () => useAuthStore.getState().accessToken,
};
```

---

## Consequences

- Do not add Redux, MobX, or Context-based global state — use Zustand
- New global state slices get their own `<name>-store.ts` file
- Server data is never duplicated in Zustand — use React Query's cache
- Each store exports both the hook (`useAuthStore`) and any non-hook utils
- Stores with non-sensitive persistent state use `persist` middleware with `mmkvStorage`
- Sensitive persistence (tokens) uses `secureStorage` in the repository layer, not Zustand `persist`
