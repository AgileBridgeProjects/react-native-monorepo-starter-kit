# Features

Each subdirectory is a self-contained **bounded context** — a feature that owns its entire vertical slice from API to UI.

## Structure of every feature

### API features (auth, rewards, future CRUD)

```text
<feature-name>/
  domain/
    failures/        # Typed error classes. Pure TS, no deps.
    auth.types.ts    # Shared types (delete when proxy covers it)
  infrastructure/
    datasources/     # HTTP calls via proxy or apiClient; error translation; token storage.
  presentation/
    hooks/           # useQuery / useMutation wrapping the datasource.
    screens/
    components/
    utils/           # Pure display helpers (formatting, initials, etc.)
```

### Features with complex local logic (game engines)

Complex features (crossword, fill-in-the-blank, etc.) may add `domain/entities/` and `application/services/` when there is genuinely complex game-state logic worth testing in isolation. See `docs/standards/architecture.md` for when extra layers are earned.

## Dependency rule

```text
presentation/hooks  →  infrastructure/datasources  →  proxy / apiClient
```

No `IRepository` interfaces, `RepositoryImpl` classes, `UseCase` classes, or `Service` classes unless complexity earns them.

## Creating a new feature

1. Run `/spec:new <feature-name>` and complete the Spec-Driven Workflow.
2. Use the `auth` feature as the reference implementation for API features.
3. Create the 3-layer directory structure with `README.md` in each.
4. Create shared test factories in `test/factories/<feature>.factory.ts` and export from `test/factories/index.ts`.
5. Write tests in `__tests__/src/features/<feature>/` mirroring the source path exactly.
6. Add MSW handlers in `test/mocks/handlers.ts` for datasource integration tests.
7. Add the controller→datasource mapping row to this file.

## Cross-feature imports

- Prefer passing data via props or route params.
- For shared types, promote them to `src/types/`.
- Never import from another feature's `infrastructure/` layer.

## Current features

| Feature | Backend controller | Status |
|---|---|---|
| `auth` | `AuthController` | Completed |
| `calendar` | `CalendarEventsController` (in flight) → `CalendarEventsDataSource` | Placeholder types/datasource pending backend |
| `check-ins` | `CheckInsController` → `CheckInsDataSource` | Completed |
| `disc` | `DiscController` → `DiscDataSource` | Completed |
| `journal` | `JournalEntriesController` → `JournalEntriesDataSource` | Completed |
| `journal-alerts` | `JournalAlertsController` | Completed |
| `messages` | `ConversationsController` → `ConversationsDataSource`, `MessagesController` → `MessagesDataSource` | Completed |
| `notifications` | `PushNotificationsController`, `DeviceTokensController` | Completed |
| `onboarding` | `UsersSetupController` | Completed |
| `profile` | `UsersController` → `ProfileDataSource`, `SupportController` | Completed |
| `reflect` | N/A (tab container only; segments delegate to the `journal` and `reflections` features) | Completed |
| `reflections` | `ReflectionAssignmentsController` → `ReflectionAssignmentsDataSource` | Completed |
| `skills` | N/A (bundled static content + MMKV; future admin-portal content API — see `skills/README.md`) | Foundation |
| `stats-import` | `StatsController` | Completed |
