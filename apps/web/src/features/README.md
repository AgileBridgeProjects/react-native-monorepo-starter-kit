# Features

Each subdirectory is a self-contained **bounded context** — a feature that owns its entire vertical slice from API to UI.

## Structure of every feature

```text
<feature-name>/
  domain/
    failures/        # Typed error classes. Pure TS, no deps.
  infrastructure/
    datasources/     # HTTP calls via proxy or apiClient; error translation.
  presentation/
    hooks/           # useQuery / useMutation wrapping the datasource.
    pages/           # Next.js App Router pages (thin shells only).
    components/
    utils/           # Pure display helpers.
```

## Dependency rule

```text
presentation/hooks  →  infrastructure/datasources  →  proxy / apiClient
```

No `IRepository` interfaces, `RepositoryImpl` classes, `UseCase` classes, or `Service` classes unless complexity earns them. See `docs/standards/architecture.md`.

## Creating a new feature

1. Run `spec-workflow` MCP tools to create a spec and complete the SDW.
2. Use the `auth` feature structure as a template.
3. Create shared test factories in `test/factories/<feature>.factory.ts`.
4. Write tests in `__tests__/src/features/<feature>/` mirroring the source path.
5. Add MSW handlers in `test/mocks/handlers.ts` for datasource integration tests.
6. Add the controller→datasource mapping row to this file.

## Current features

| Feature | Backend controller | Status |
|---|---|---|
| `auth` | `AuthController` | Skeleton |
| `companies` | `CompaniesController` (WebApi — pending) | Mock datasource; full CRUD UI complete |
