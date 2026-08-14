# Domain Layer — Auth

Pure TypeScript. No framework dependencies.

## What lives here

| File / Folder | Contents |
|---|---|
| `failures/` | Typed error classes thrown by the datasource; caught in hooks to display user-facing messages. |

## Rules

- No imports from any other layer.
- No framework imports — no React, no axios, no React Query.
- Failures are business-rule violations, not HTTP errors.
