# Presentation Layer — Auth

The only layer that knows about React. Screens, components, hooks, and display utilities.

## What lives here

| Folder | Contents |
|---|---|
| `hooks/` | React Query mutations/queries wrapping `AuthDataSource`. The datasource is instantiated once at module level. |
| `screens/` | Full-page components registered in `app/` via Expo Router. |
| `utils/` | Pure display helpers (e.g. `getUserInitials`). No side effects, no API calls. |

## Rules

- Hooks call the datasource directly — no intermediate service or use-case class.
- Hooks catch domain failures (e.g. `InvalidCredentialsFailure`) and map them to user-facing messages via `getErrorMessage`.
- Screens are thin: pass data down, events up. No business logic inline.
- Use Zod + react-hook-form for all form validation.
- No direct API calls from screens or components — always through hooks.

## Hook naming convention

- Mutations: `useLogin`, `useLogout`, `useSendPhoneOtp`, `useVerifyOtp`
- Queries: `useCurrentUser`, `useProfile`
