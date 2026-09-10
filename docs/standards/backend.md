# Backend Standards — Index

All backend rules live in `docs/standards/backend/`. **Never load this file universally** — read only the subfile relevant to the current task.

## Routing Table

| Task | File |
|---|---|
| Folder structure, project layout, naming conventions, seed data | [`backend/structure.md`](backend/structure.md) |
| Controller actions, endpoints, orchestration, SSRF, validation | [`backend/controllers.md`](backend/controllers.md) |
| Repository interfaces, `WhereIf`, `ApplySorting`, pagination, `GetAsync` | [`backend/repositories.md`](backend/repositories.md) |
| All testing — unit, integration, Data.Tests, base classes, E2E triggers | [`backend/testing.md`](backend/testing.md) |
| Hangfire processors, enqueueing jobs, `IDbExecutionStrategy` | [`backend/jobs.md`](backend/jobs.md) |
| Options pattern, Mapperly, validation, enums, AI providers, Blob Storage | [`backend/patterns.md`](backend/patterns.md) |
| Entity auditing, `IAuditable`/`ISoftDeletable`/`IConcurrent`, EF migrations, soft-delete, concurrency | [`backend/auditing.md`](backend/auditing.md) |
| EF global query filters, `[AllowImpersonation]`, tenant-scoped entities | [`backend/multitenancy.md`](backend/multitenancy.md) |
| Snapshot tables, upsert pattern, `UserReportingExclusion`, reporting domain conventions | [`reporting.md`](reporting.md) |

## Dependency Rule (Never Break This)

```text
StarterKit.MobileApi  ──┐
                    ├──▶  StarterKit.Core  ──▶  StarterKit.Data  ──▶  PostgreSQL
StarterKit.WebApi     ──┘
```

- API projects reference `StarterKit.Core` only — never `StarterKit.Data` directly
- `StarterKit.Core` references `StarterKit.Data` only — never the API projects
- `StarterKit.Data` has **no project references** — it only depends on NuGet packages (EF Core, etc.)
- Business logic lives in `StarterKit.Core` — never in controllers
