# StarterKit

A cross-platform application for game management, built as a Turborepo monorepo with a mobile
app (Expo), an admin portal (Next.js), and a backend (.NET 10).

> **All coding standards live in `docs/standards/` — read the relevant file before writing any code.**
> These docs are shared across all AI tools. `docs/standards/` always wins over anything written here.

---

## Standards Reference

| Area | File |
|---|---|
| Project setup, tech stack, commands, structure, path aliases | `docs/standards/monorepo.md` |
| Clean architecture, dependency rules, layer responsibilities | `docs/standards/architecture.md` |
| Frontend shared rules (imports, DRY, HTTP, state, testing, feature structure) | `docs/standards/frontend.md` |
| Frontend web-specific (Tailwind, DevExtreme, route guards, web components) | `docs/standards/frontend-web.md` |
| Frontend mobile-specific (NativeWind, Expo components, haptics, gestures) | `docs/standards/frontend-mobile.md` |
| What is still to come from upstream, and the repo settings a clone does not get | `docs/upstream-backlog.md` |
| Branching / promotion model (`dev` → `uat` → `main`, back-merges) | `docs/standards/branching.md` |
| OTA / EAS Update (publish script, mobile versioning / `version.json`, runtime version policy, restart prompt) | `docs/standards/ota-updates.md` |
| Production store releases (dispatch, staging, store credentials) | `docs/deployment/prod-mobile-store-setup.md` |
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
| Writing PR prose (descriptions, review comments, replies) | `.agents/skills/pr-writing/SKILL.md` |
| Reviewing a PR (scope filter, line-anchored comments) | `.agents/skills/pr-review/SKILL.md` |
| Skills, MCP servers, commands, instruction files | `docs/ai-tooling-setup.md` |

**Full reference docs:** `docs/design-system.md`, `docs/architecture.md`, `docs/contributing.md`,
`docs/adr/`, layer `README.md` files.

**Signed-off Business Requirements:** `docs/starterkit-brd.md` — the approved scope, personas and NFRs. Read this when making decisions about product scope. Ships as a template; fill it in.

**Entity Relationship Diagram:** `docs/erd.md` — the Mermaid ERD for the database. Read this when working with backend data models, migrations, relationships, or any feature that touches the schema. Update it whenever a migration adds, removes, or renames a table or column.

---

## AI Tooling In This Repo

See `docs/ai-tooling-setup.md` for the complete AI tooling setup (skills, MCP servers, instruction files).

### Shared skills

- Shared skill definitions live in `.agents/skills/` — the canonical repo copy.
- When a task clearly matches a repo skill, read the relevant `.agents/skills/<skill>/SKILL.md`
  and follow it.
- Load only the specific skill(s) the task needs — do not bulk-read every skill.

### Workflow commands

Canonical workflow prompts live in `.agents/commands/`. Read the relevant command file when the
user triggers a workflow by name (e.g. "create spec", "open PR").

| Workflow | Command file |
|---|---|
| Format backend code | `.agents/commands/format-backend.md` |
| Add a Key Vault secret / env var | `.agents/commands/add-secret.md` |
| Open a pull request | `.agents/commands/pr.md` |
| Review a PR (line-anchored comments) | `.agents/commands/review-pr.md` |
| Run E2E tests | `.agents/commands/e2e.md` |
| Spec workflow (`new`, `requirements`, `design`, `review`, `approve`, `tasks`, `status`, `switch`, `update-task`, `implement`) | `.agents/commands/spec-<action>.md` |

Codex reads `.agents/commands/` directly. The `spec-workflow` MCP server is the preferred way to
manage specs across all agents; `.claude/commands/spec/` slash commands are legacy wrappers.

### Agent-specific instructions

- **Codex** uses `AGENTS.md` (this file).
- **Claude Code** uses `CLAUDE.md` plus slash-command prompts in `.claude/commands/`.
- **GitHub Copilot** uses `.github/copilot-instructions.md`.
- Keep shared repo policy aligned across these files; do not assume another agent reads `AGENTS.md`.

### MCP boundaries

- `.mcp.json` — Claude Code MCP config.
- `.vscode/mcp.json` — VS Code / GitHub Copilot MCP config.
- `.codex/config.toml` — Codex project MCP config for this repo.
- Do not assume Codex reads `.mcp.json` or `.vscode/mcp.json`.
- Keep Codex MCP changes in `.codex/config.toml`.

### Spec-Driven Workflow

**Never start implementing a feature without an approved spec.**
See `docs/standards/monorepo.md` → *Spec-Driven Workflow* for the full workflow and approval process.
Do not generate steering documents — project context comes from `docs/standards/`.

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
