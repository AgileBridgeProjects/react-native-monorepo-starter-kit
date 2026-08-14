# StarterKit

Cross-platform game management — Turborepo monorepo: mobile (Expo), admin portal (Next.js), backend (.NET 10).

> **All coding standards live in `docs/standards/` — always wins over anything written here.**

---

## Load on Demand

Read the relevant file(s) before writing any code. Never load files not relevant to the task.

| Task | File(s) |
|---|---|
| Project setup, commands, structure, aliases | `docs/standards/monorepo.md` |
| Architecture, dependency rules, layer responsibilities | `docs/standards/architecture.md` |
| Any backend task | `.claude/rules/backend.md` → routes to correct subfile |
| Backend folder/module structure | `docs/standards/backend/structure.md` |
| Backend controller / endpoint | `docs/standards/backend/controllers.md` + `docs/standards/backend/mcp.md` |
| MCP tools / MCP server endpoint | `docs/standards/backend/mcp.md` |
| Backend repository / EF Core | `docs/standards/backend/repositories.md` |
| Backend testing | `docs/standards/backend/testing.md` |
| Background jobs / Hangfire | `docs/standards/backend/jobs.md` |
| Options / Mapperly / providers / Blob | `docs/standards/backend/patterns.md` |
| EF migrations / auditing / soft-delete | `docs/standards/backend/auditing.md` |
| Multitenancy / impersonation / query filters | `docs/standards/backend/multitenancy.md` |
| Supabase / self-hosted auth & DB | `docs/standards/supabase.md` |
| Reporting domain (snapshots, upsert, exclusions) | `docs/standards/reporting.md` |
| PDF report generation (Playwright capture, print layouts) | `docs/standards/pdf-reports.md` |
| Frontend shared (web + mobile) | `docs/standards/frontend.md` |
| Frontend web | `docs/standards/frontend.md` + `docs/standards/frontend-web.md` |
| Frontend mobile | `docs/standards/frontend.md` + `docs/standards/frontend-mobile.md` |
| OTA / EAS Update (publish, runtime version, restart prompt) | `docs/standards/ota-updates.md` |
| App Store compliance | `docs/apple-app-store-review.md` / `docs/google-play-store-review.md` / `docs/huawei-appgallery-review.md` |
| E2E tests | `docs/standards/e2e-testing.md` |
| Time zone testing for local dev (SA devs simulating US zones) | `docs/standards/dev-timezone-testing.md` |
| Security / SSRF / RBAC / TLS | `docs/standards/nfr-security.md` |
| Accessibility (WCAG 2.1 AA) | `docs/standards/nfr-accessibility.md` |
| Compliance / PII / POPIA / GDPR | `docs/standards/nfr-compliance.md` |
| Performance / Polly / pagination / 60fps | `docs/standards/nfr-performance.md` |
| Logging / Sentry / health checks | `docs/standards/nfr-observability.md` |
| AI prompts / payload builders | `docs/standards/ai-prompts.md` |
| Notifications (email/SMS) | `docs/standards/notifications.md` |
| SignalR real-time | `docs/standards/signalr.md` |
| Caching | `docs/standards/caching.md` |
| Audio/SFX | `docs/standards/audio.md` |
| Quality gates / enforcement (hooks, `check:architecture`, `check:standards`) | `docs/standards/enforcement.md` |
| Opening a PR (mandatory pre-PR standards sweep) | `docs/standards/pr-readiness.md` |
| Writing PR prose (description, review comments, replies) | `.agents/skills/pr-writing/SKILL.md` |
| Reviewing a PR (scope filter, line-anchored comments) | `.agents/skills/pr-review/SKILL.md` — or run `/review-pr` |
| AI tooling, MCP, skills, commands | `docs/ai-tooling-setup.md` |

**Reference docs:** `docs/design-system.md`, `docs/architecture.md`, `docs/contributing.md`, `docs/mobile-deployment.md` (app identities, store setup per new bundle id), `docs/adr/`, layer `README.md` files.

**BRD:** `docs/starterkit-brd.md` — signed-off scope, personas, game types, NFRs.

**ERD:** `docs/erd.md` — 29 entities. Read for any DB/migration work. Update whenever a migration adds, removes, or renames a table or column.

---

## Updating standards

Update `docs/standards/` first — single source of truth for Claude, Copilot, Codex, and all other agents. If adding a new standards file, add a row to the table above, `AGENTS.md`, and `.github/copilot-instructions.md`. Never duplicate rule content into those files.

Do not generate steering documents — project context comes from `docs/standards/`.

---

## graphify

Multi-module tasks or new entity relationships: read `graphify-out/CHEAT_SHEET.md` first (module topology). Deeper exploration: `graphify-out/GRAPH_REPORT.md`. Rebuild: `/graphify` in Copilot Chat.
