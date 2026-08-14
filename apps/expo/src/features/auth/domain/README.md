# Domain Layer — Auth

Pure TypeScript. No framework dependencies.

## What lives here

| File / Folder | Contents |
|---|---|
| `auth.types.ts` | `AuthUser` interface — the shape used throughout the feature. Replace with the proxy-generated type once `AuthController` has a `[Tags]` attribute. |
| `failures/` | Typed error classes thrown by the datasource; caught in hooks to display user-facing messages. |

## Rules

- No imports from any other layer.
- No framework imports — no React, no axios, no Expo.
- Failures are business-rule violations, not HTTP errors. `InvalidCredentialsFailure` is thrown by the datasource when the API returns 401; the hook catches it and shows a message.
