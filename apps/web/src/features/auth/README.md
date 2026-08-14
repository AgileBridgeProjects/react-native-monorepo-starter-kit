# Auth Feature — Web

Handles user authentication for the admin portal via Azure B2C.

## Structure

```text
auth/
  domain/
    failures/        # AuthFailure, InvalidCredentialsFailure, etc.
  infrastructure/
    datasources/     # AuthDataSource — one method per AuthController endpoint.
  presentation/
    hooks/           # useLogin, useLogout, useCurrentUser
    pages/           # Next.js page shells (re-export screens only)
    components/      # Feature-specific UI components
```

## Reference implementation

See `apps/expo/src/features/auth/` for the mobile equivalent — same structure, same pattern.

## Backend mirror

`AuthController` (StarterKit.WebApi) → `AuthDataSource` (infrastructure/datasources/)
