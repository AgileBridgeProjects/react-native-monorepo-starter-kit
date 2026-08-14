# Presentation Layer — Auth

The only layer that knows about React. Pages, components, and hooks.

## What lives here

| Folder | Contents |
|---|---|
| `hooks/` | React Query mutations/queries wrapping `AuthDataSource`. The datasource is instantiated once at module level. |
| `pages/` | Full-page components registered in `src/app/` via Next.js App Router. |
| `components/` | Feature-specific UI components (not reusable across features). |

## Rules

- Hooks call the datasource directly — no intermediate service or use-case class.
- Hooks catch domain failures (e.g. `InvalidCredentialsFailure`) and map them to user-facing messages.
- Pages are thin: pass data down, events up. No business logic inline.
- Use Zod + react-hook-form for all form validation.
- All components using DevExtreme must have `'use client'` at the top.
- No direct API calls from pages or components — always through hooks.

## Hook naming convention

- Mutations: `useLogin`, `useLogout`
- Queries: `useCurrentUser`, `useProfile`
