# StarterKit — Copilot Instructions

> **Single source of truth for all coding standards: `docs/standards/`**
> These files are shared across all AI tools (Claude, Copilot, Codex).
> **Always read the relevant `docs/standards/` file before writing or reviewing code.**
> `docs/standards/` always wins over anything written here.

**When you add or change a coding rule**, update `docs/standards/` first — that is the single
source of truth. Then keep `AGENTS.md` and `CLAUDE.md` in sync by updating their standards
reference tables if a new file was added. Do not duplicate rule content here.

Do not generate steering documents — project context comes from `docs/standards/`.

Full reference docs: `docs/design-system.md`, `docs/architecture.md`, `docs/contributing.md`,
`docs/adr/`, layer `README.md` files.

**Signed-off Business Requirements:** `docs/starterkit-brd.md` — the client-approved BRD covering all in-scope features (Learn Content, Play Games, Scoreboards, Rewards, Notifications, Dashboard/Reports, System Access). Read this when making decisions about product scope, personas, game types, or NFRs.

**Entity Relationship Diagram:** `docs/erd.md` — Mermaid ERD for all 29 database entities. Read this when working with backend data models, migrations, relationships, or any feature that touches the database schema. Update it whenever a migration adds, removes, or renames a table or column.

---

## Standards Reference

| Area | File |
|---|---|
| Project setup, tech stack, commands, structure, path aliases | `docs/standards/monorepo.md` |
| Clean architecture, dependency rules, layer responsibilities | `docs/standards/architecture.md` |
| Frontend shared rules (imports, DRY, HTTP, state, testing, feature structure) | `docs/standards/frontend.md` |
| Frontend web-specific (Tailwind, DevExtreme, route guards, web components) | `docs/standards/frontend-web.md` |
| Frontend mobile-specific (NativeWind, Expo components, haptics, gestures) | `docs/standards/frontend-mobile.md` |
| OTA / EAS Update (publish script, runtime version policy, restart prompt) | `docs/standards/ota-updates.md` |
| Apple App Store review requirements (all Expo PRs) | `docs/apple-app-store-review.md` |
| Google Play Store review requirements (all Expo PRs) | `docs/google-play-store-review.md` |
| Huawei AppGallery review requirements (AppGallery-targeted Expo PRs) | `docs/huawei-appgallery-review.md` |
| Backend folder structure, project layout, naming, seed data | `docs/standards/backend/structure.md` |
| Backend controller actions, endpoints, orchestration, SSRF, validation | `docs/standards/backend/controllers.md` |
| Backend MCP tools (parity rule, tool classes, StarterKit.Mcp) | `docs/standards/backend/mcp.md` |
| Backend repositories, `WhereIf`, `ApplySorting`, pagination | `docs/standards/backend/repositories.md` |
| Backend testing — unit, integration, Data.Tests, base classes | `docs/standards/backend/testing.md` |
| Hangfire background jobs, processors, `IDbExecutionStrategy` | `docs/standards/backend/jobs.md` |
| Options pattern, Mapperly, validation, enums, AI providers, Blob Storage | `docs/standards/backend/patterns.md` |
| Entity auditing, EF migrations, soft-delete, concurrency | `docs/standards/backend/auditing.md` |
| EF query filters, `[AllowImpersonation]`, tenant-scoped entities | `docs/standards/backend/multitenancy.md` |
| Self-hosted Supabase auth & DB (GoTrue JWT, app_metadata, slimmed stack, RLS stance) | `docs/standards/supabase.md` |
| Reporting domain: snapshot tables, upsert pattern, `UserReportingExclusion` | `docs/standards/reporting.md` |
| PDF report generation (Playwright capture, print layouts) | `docs/standards/pdf-reports.md` |
| E2E testing (POM, mocks, DX quirks, CRUD pattern, Playwright) | `docs/standards/e2e-testing.md` |
| Time zone testing for local dev (SA devs simulating US zones) | `docs/standards/dev-timezone-testing.md` |
| AI Prompt System (prompt builders, payloads, extractors) | `docs/standards/ai-prompts.md` |
| NFR laws (performance, availability, security, accessibility) | `docs/standards/non-functional-requirements.md` |
| TLS, secrets management, RBAC, OWASP | `docs/standards/nfr-security.md` |
| WCAG 2.1 AA for web (Next.js) and mobile (Expo) | `docs/standards/nfr-accessibility.md` |
| POPIA/GDPR: consent, erasure, PII redaction, data retention | `docs/standards/nfr-compliance.md` |
| Polly retry, pagination, EF Core tuning, React Query, 60fps | `docs/standards/nfr-performance.md` |
| Backend IDistributedCache, CacheKeys, eviction tokens; frontend datasource TTL cache | `docs/standards/caching.md` |
| Serilog, Application Insights, Sentry, health checks | `docs/standards/nfr-observability.md` |
| Email/SMS notifications (Resend, Twilio, dispatcher pattern) | `docs/standards/notifications.md` |
| SignalR real-time hub (auth, broadcaster pattern, useSignalR, schedule-gated delivery) | `docs/standards/signalr.md` |
| Audio/SFX (expo-audio, useSfx hook, file standards, app store compliance) | `docs/standards/audio.md` |
| Quality gates: git hooks, `check:architecture` / `check:standards`, knip/secretlint, baselines | `docs/standards/enforcement.md` |
| Opening a PR — mandatory pre-PR standards sweep (DRY, shared placement, comment accuracy, silent failures) | `docs/standards/pr-readiness.md` |
| Writing PR prose (description, review comments, replies) | `.agents/skills/pr-writing/SKILL.md` |
| Reviewing a PR (scope filter, line-anchored comments) | `.agents/skills/pr-review/SKILL.md` |
| Skills, MCP servers, commands, instruction files | `docs/ai-tooling-setup.md` |

---

## AI Tooling In This Repo

See `docs/ai-tooling-setup.md` for the complete AI tooling setup (skills, MCP servers, instruction files).

### Shared skills

Skill definitions live in `.agents/skills/` (canonical) and are mirrored to `.claude/skills/` for
Claude Code. When a task clearly matches a repo skill, read the relevant `.agents/skills/<skill>/SKILL.md`
and follow it. Load only the specific skill(s) the task needs — do not bulk-read every skill.

### Workflow commands

Canonical workflow prompts live in `.agents/commands/`. Read the relevant command file when the
user triggers a workflow by name (e.g. create spec, open PR).

| Workflow | Command file |
|---|---|
| Format backend code | `.agents/commands/format-backend.md` |
| Add a Key Vault secret / env var | `.agents/commands/add-secret.md` |
| Open a pull request | `.agents/commands/pr.md` |
| Run E2E tests | `.agents/commands/e2e.md` |
| Spec workflow (`new`, `design`, `review`, `approve`, `implement`, `tasks`, `status`) | `.agents/commands/spec-<action>.md` |

### MCP servers

- **Copilot**: `.vscode/mcp.json`
- **Claude Code**: `.mcp.json`
- **Codex**: `.codex/config.toml`

### Spec-Driven Workflow

New features must have an approved spec before any implementation code is written.
Specs are managed by the `spec-workflow` MCP server. Specs live in `.spec-workflow/specs/`.
Tell the user to run `npm run spec:dashboard` to open the browser-based approval UI.
Approvals must go through the dashboard — verbal approval is never accepted.

## Standards Loading — Read Only What You Need

**Always-load** (small, navigation-level — read these for every task):

- `docs/standards/monorepo.md` — tech stack, commands, path aliases
- `docs/standards/architecture.md` — dependency rules, layer responsibilities

**Load on demand** — read the relevant file for the current task type:

| Task type | File(s) to read |
|---|---|
| Any backend task | `docs/standards/backend/` — see routing table in `backend.md` |
| Backend folder/module structure | `docs/standards/backend/structure.md` |
| Backend controller / endpoint | `docs/standards/backend/controllers.md` + `docs/standards/backend/mcp.md` |
| Backend MCP tool / MCP server | `docs/standards/backend/mcp.md` |
| Backend repository / EF Core query | `docs/standards/backend/repositories.md` |
| Backend testing | `docs/standards/backend/testing.md` |
| Background jobs / Hangfire | `docs/standards/backend/jobs.md` |
| Options / Mapperly / providers / Blob | `docs/standards/backend/patterns.md` |
| EF migrations / auditing / soft-delete | `docs/standards/backend/auditing.md` |
| Multitenancy / impersonation / query filters | `docs/standards/backend/multitenancy.md` |
| Supabase / self-hosted auth & DB | `docs/standards/supabase.md` |
| Reporting domain (snapshots, services, endpoints) | `docs/standards/reporting.md` |
| Frontend shared (both web + mobile) | `docs/standards/frontend.md` |
| Frontend web task | `docs/standards/frontend.md` + `docs/standards/frontend-web.md` |
| Frontend mobile task | `docs/standards/frontend.md` + `docs/standards/frontend-mobile.md` |
| OTA / EAS Update | `docs/standards/ota-updates.md` |
| E2E tests | `docs/standards/e2e-testing.md` |
| Time zone testing for local dev | `docs/standards/dev-timezone-testing.md` |
| Security concern / SSRF / RBAC / TLS | `docs/standards/nfr-security.md` |
| Accessibility (WCAG) | `docs/standards/nfr-accessibility.md` |
| Compliance / PII / POPIA / GDPR | `docs/standards/nfr-compliance.md` |
| Performance / Polly / pagination / 60fps | `docs/standards/nfr-performance.md` |
| Logging / Sentry / health checks | `docs/standards/nfr-observability.md` |
| AI prompts / payload builders | `docs/standards/ai-prompts.md` |
| Notifications (email/SMS) | `docs/standards/notifications.md` |
| SignalR real-time | `docs/standards/signalr.md` |
| Caching | `docs/standards/caching.md` |
| Audio/SFX | `docs/standards/audio.md` |

**Do not load standards files that are not relevant to the current task.** This reduces context bloat and keeps responses faster and more accurate.

## graphify

Before any task that touches more than one feature module, or any task involving a new entity relationship, read `graphify-out/CHEAT_SHEET.md` first (30-line module topology). For deeper architecture exploration, read `graphify-out/GRAPH_REPORT.md`.
Type `/graphify` in Copilot Chat to build or update the knowledge graph.
