---
globs:
  - "apps/backend/src/**/Reports/**"
  - "apps/backend/tests/**/Reports/**"
---

# Reporting context active

## Before writing any code

Read `docs/standards/reporting.md` — it covers the snapshot architecture, upsert pattern,
`UserReportingExclusion`, entity conventions, and repository rules specific to the reporting domain.

For general repository and backend rules also load the relevant file from `docs/standards/backend/`:

| Task | Load |
|---|---|
| Controller / endpoint | `docs/standards/backend/controllers.md` |
| Repository / EF query | `docs/standards/backend/repositories.md` |
| Tests | `docs/standards/backend/testing.md` |
| New snapshot entity / migration | `docs/standards/backend/auditing.md` |
| Multitenancy / `IgnoreQueryFilters` | `docs/standards/backend/multitenancy.md` |

## Invariants (always true for reporting code)

- Snapshot tables use the upsert pattern — never delete and re-insert historical rows
- All snapshot entities implement `IAuditable`, `ISoftDeletable`, and `IConcurrent`
- Refresh jobs call `IgnoreQueryFilters()` — add explicit `!x.IsDeleted` predicates
- `UserReportingExclusion` is the only way to exclude a user from all report queries
