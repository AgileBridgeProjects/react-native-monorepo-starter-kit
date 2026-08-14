# lib — Shared Infrastructure Utilities

Cross-cutting technical concerns shared across all features. Not business logic — pure plumbing.

## Modules

### `http/`

| File | Purpose |
|---|---|
| `api-client.ts` | Singleton axios instance with auth and error interceptors |
| `api-error.ts` | `ApiError` class — normalised errors from any HTTP response |
| `query-client.ts` | React Query `QueryClient` with global retry and stale-time config |
| `index.ts` | Barrel export |

**Rules:**

- All datasources import `apiClient` from here — never create their own axios instance.
- Interceptors use lazy `import()` (not `require()`) for auth store access — avoids circular imports and works with Vite path aliases.
- Request interceptor attaches `Bearer` token from `authStoreUtils`.
- Response interceptor handles 401 with token refresh (queued to prevent races) and logout on failure.

### `storage/`

| File | Purpose |
|---|---|
| `secure-storage.ts` | `expo-secure-store` wrapper with web shim (sessionStorage) |
| `mmkv-storage.ts` | `react-native-mmkv` wrapper — Zustand-compatible `StateStorage` adapter |
| `encrypted-mmkv-storage.ts` | AES-256-encrypted `react-native-mmkv` instance, key held in the Keychain/Keystore via expo-secure-store |
| `index.ts` | Barrel export |

**Rules:**

- Sensitive data (auth tokens, credentials) → `secureStorage` (encrypted via expo-secure-store)
- Sensitive but high-volume/large data (e.g. Journal drafts) → `encryptedMmkvStorage` (fast KV, encrypted at rest)
- Non-sensitive data (preferences, onboarding) → `mmkvStorage` (fast KV via MMKV)
- All keys are declared in `STORAGE_KEYS` — no string literals scattered through the codebase
- `mmkvStorage` implements Zustand's `StateStorage` interface, so stores can use `persist` middleware directly:

  ```ts
  persist(storeImpl, { name: 'store-name', storage: createJSONStorage(() => mmkvStorage) })
  ```

### `cn.ts`

Tailwind class merger combining `clsx` and `tailwind-merge`. Import as `cn()` and use in all components — never template literal concatenation.

### `error-message.ts`

`getErrorMessage()` utility that extracts a user-facing message from any error type (domain Failure, ApiError, Error, unknown). Prevents duplicating error message extraction logic across hooks.

## What does NOT live here

- Business logic (belongs in `features/<name>/application/`)
- UI utilities (belongs in `components/` or feature `presentation/`)
- Type definitions (belongs in `types/`)
