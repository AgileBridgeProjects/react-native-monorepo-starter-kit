---
globs:
  - "apps/backend/**"
---

# Backend context active

## Before writing any code

Load the relevant subfile from `docs/standards/backend/` for the task:

| Task | Load |
|---|---|
| Controller / endpoint | `docs/standards/backend/controllers.md` + `docs/standards/backend/mcp.md` |
| MCP tool / MCP server | `docs/standards/backend/mcp.md` |
| Repository / EF query | `docs/standards/backend/repositories.md` |
| Tests | `docs/standards/backend/testing.md` |
| Background job | `docs/standards/backend/jobs.md` |
| New entity / migration | `docs/standards/backend/auditing.md` |
| Options / Mapperly / Blob | `docs/standards/backend/patterns.md` |
| Multitenancy / impersonation | `docs/standards/backend/multitenancy.md` |
| Folder / project structure | `docs/standards/backend/structure.md` |

## New entity? Use the scaffold script first

```bash
npm run scaffold:backend -- --module <Module> --entity <Entity>
# Add --tenant for company-scoped entities
# Add --api web or --api both if WebApi controller is also needed
```

The script generates 20 files. Fill in domain logic only — do not recreate boilerplate.

## CLI commands (use RTK variants for token savings)

```bash
dotnet build               # from apps/backend
dotnet test                # from apps/backend
dotnet csharpier format .  # format all C# (run after changes)
dotnet csharpier check .   # CI check
```

If you have the `rtk` CLI installed it wraps the first two with compacted output
(`rtk dotnet build`, `rtk dotnet test`). It is an optional per-developer tool, not a
repo dependency.

## Invariants (always true)

- File-scoped namespaces — `namespace StarterKit.X.Y;` not `namespace StarterKit.X.Y { }`
- Primary constructors — `class Foo(IDep dep)` not `private readonly IDep _dep;`
- Thin controllers — no business logic, delegate to `StarterKit.Core` services
- Repositories live in `StarterKit.Data`, never in `StarterKit.Core`
- Every controller has a sibling `Mcp/<X>McpTools.cs` MCP tool class with matching `[Authorize]` policies (see `docs/standards/backend/mcp.md`)
