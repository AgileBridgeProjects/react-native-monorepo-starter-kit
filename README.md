# React Native Monorepo Starter Kit

A production-grade, batteries-included monorepo for teams shipping a **React Native app, an admin portal, and a .NET backend** from one repo — extracted from two shipped production products and made generic.

Clone it, rename the brand, and start building features on day one instead of spending a month on plumbing.

## What's inside

| App | Stack | What it gives you |
|---|---|---|
| `apps/expo` | Expo SDK (React Native), expo-router, Tailwind v4 (Uniwind), TanStack Query, i18n | Auth flows (email/password, OTP, Google, Apple, Microsoft), profile/settings, native tabs incl. iOS liquid glass, OTA updates via EAS Update, push notifications (APNs + FCM), deep links |
| `apps/web` | Next.js (App Router), DevExtreme, Tailwind v4, TanStack Query | Admin portal: tenant management, user management with bulk upload, roles & permissions editor, audit log viewer, workspace switching / impersonation |
| `apps/backend` | .NET 10, EF Core + PostgreSQL, Hangfire, SignalR, Supabase auth | Modular monolith (Core / Data / WebApi / MobileApi / Auth / Mcp / Migrator), multitenancy with global query filters, RBAC, auditing + soft delete + concurrency interceptors, snapshot-based reporting, Excel export, email/SMS/push senders, an MCP server mirroring every controller |
| `packages/shared` | Design tokens, shared TS | One `tokens.css` consumed by both frontends |
| `e2e` | Playwright (web + Expo web), Maestro (native) | Page Object Model, mocked externals, dockerized test env |

Plus the parts that are usually tribal knowledge:

- **`docs/standards/`** — the coding standards that actually built these apps: architecture and dependency rules, backend patterns (controllers, repositories, jobs, options, Mapperly), frontend layering (`Screen → Hook → Datasource → Proxy → apiClient`), reporting, caching, SignalR, notifications, security/accessibility/performance/observability NFRs, e2e patterns, OTA updates, store-review checklists.
- **AI-tooling ready** — `CLAUDE.md`, `AGENTS.md`, Copilot instructions, `.claude/` rules + skills + hooks, `.agents/` commands (PR writing, PR review, spec workflow), and `.mcp.json`. Point any coding agent at the repo and it inherits the standards.
- **Scaffolding** — `npm run scaffold:frontend` and `npm run scaffold:backend` generate the full boilerplate for a new feature/module (20 files on the backend) so the patterns stay consistent.
- **Quality gates** — Biome, CSharpier, commitlint, lint-staged + Husky, knip, secretlint, architecture/standards check scripts, GitHub Actions workflows.

## Architecture

```text
apps/expo ──┐                       ┌── StarterKit.MobileApi ──┐
            ├── generated proxy ────┤                          ├── StarterKit.Core ── StarterKit.Data ── PostgreSQL
apps/web  ──┘   (Orval, OpenAPI)    └── StarterKit.WebApi ─────┘         │
                                                 │                  Hangfire jobs
                                          MCP server (per-controller tools)
```

- **Frontends** never call HTTP directly: `Screen/Page → Hook (TanStack Query) → Datasource (typed failures) → generated Proxy → apiClient`.
- **Backend** is a modular monolith: thin controllers delegate to `Core` services; repositories live in `Data`; every controller has a sibling MCP tool class with matching authorization policies.
- **Multitenancy**: tenant-scoped entities implement a tenant interface; global EF query filters + an ambient tenant context enforce isolation; the admin portal supports cross-tenant workspace switching and impersonation.
- **Reporting**: append-only daily snapshot tables refreshed by idempotent Hangfire jobs — with run tracking, batched cross-tenant aggregation, retroactive exclusion healing, and forecast-safe trend buckets.

## The example domain

The kit ships a small, working example domain so every layer has a real vertical to copy:

- **Club** — the tenant aggregate (rename to Organization/Company/School/…)
- **Team** — sub-groups within a tenant, with seasons
- **User** — with roles, permissions, bulk upload, and guardian links

Example features: `auth`, `profile` (Expo); `auth`, `users`, `roles`, `clubs`, `audit-log`, `workspace`, `mobile-setup` (web); `Users`, `Roles`, `Clubs`, `Teams`, `Seasons`, `Reports`, `Notifications`, `PushNotifications` + all infrastructure (backend).

Product-specific features were deliberately removed; use the scaffold scripts to add yours.

## Getting started

Prerequisites: Node 22+, .NET 10 SDK, Docker.

```bash
npm install
cp .env.example .env.local            # fill in what you need
docker compose up -d                  # PostgreSQL + local Supabase
```

Backend:

```bash
cd apps/backend
dotnet ef migrations add InitialCreate --project src/StarterKit.Data --startup-project src/StarterKit.Migrator
dotnet run --project src/StarterKit.Migrator
dotnet run --project src/StarterKit.WebApi     # and/or StarterKit.MobileApi
```

Frontends:

```bash
npm run dev --workspace apps/web
npm run start --workspace apps/expo
```

Then read, in order:

1. `docs/standards/monorepo.md` — commands, structure, aliases
2. `docs/standards/architecture.md` — the dependency rules everything else assumes
3. `docs/contributing.md`

## Making it yours

1. **Search & replace** `StarterKit`/`starterkit` with your product name (solution, namespaces, package scope, app scheme).
2. **App identity**: set your own bundle ids, EAS project id and owner in `apps/expo/app.json` + `eas.json` (all placeholders marked `YOUR-…`), register Firebase apps and OAuth clients — see `docs/mobile-deployment.md`.
3. **Supabase**: create your project (or self-host — see `infra/supabase/` and `docs/standards/supabase.md`) and fill the env placeholders.
4. **Rename the tenant**: `Club` → whatever your domain calls it.
5. Generate your initial EF migration (the kit ships none on purpose).
6. Regenerate the API proxy once your backend runs: `npm run generate:proxy`.

## Provenance & philosophy

Everything here ran in production first, in two shipped products, before being genericized. The standards docs are not aspirational — they are the rules the example code actually follows, and the AI agent config enforces them. Where the two products disagreed, the more robust pattern won (see `docs/standards/reporting.md` for a worked example).

## License

MIT © Agile Bridge
