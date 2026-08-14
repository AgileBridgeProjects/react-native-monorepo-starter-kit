# Monorepo — The Law

This file is the single source of truth for project setup, tech stack, commands, folder
structure, and path aliases. All AI instruction files (`AGENTS.md`, `CLAUDE.md`,
`.github/copilot-instructions.md`) reference this file rather than duplicating its content.

---

## Tech Stack

### Monorepo

- **Build system**: Turborepo with npm workspaces
- **Language**: TypeScript (strict mode)
- **Linting/Formatting**: Biome (replaces ESLint + Prettier)
- **Testing**: Vitest + MSW (Mock Service Worker)

### Mobile (`apps/expo`)

- **Runtime**: Expo SDK 56 + React Native 0.85 (iOS, Android, Web)
- **Routing**: Expo Router v6 (file-based routing in `app/`)
- **Styling**: Uniwind v1.5 + Tailwind CSS v4 — CSS-first design tokens (`global.css` `@theme` block imports from `@starterkit/shared/tokens.css`; `constants/tokens.ts` re-exports runtime values from `@starterkit/shared`)
- **HTTP**: Axios singleton (token-refresh interceptor) + React Query (`@tanstack/react-query`)
- **State**: Zustand (client state, MMKV-persisted) + React Query (server state)
- **Storage**: expo-secure-store (sensitive tokens) + react-native-mmkv (fast preferences)
- **Forms**: react-hook-form + Zod
- **Testing**: Vitest + React Native Testing Library + MSW
- **Animations**: React Native Reanimated v4

### Web (`apps/web`)

- **Framework**: Next.js 16 (App Router + Turbopack)
- **Styling**: Tailwind CSS v4 — CSS-first design tokens (`globals.css` imports from `@starterkit/shared/tokens.css`; semantic `--color-*` tokens mapped via `@theme inline`)
- **UI Components**: DevExtreme (DevExpress) — grids, charts, forms, schedulers
- **State**: Zustand (client state) + React Query (server state)
- **Forms**: react-hook-form + Zod
- **Testing**: Vitest + Testing Library + jsdom + MSW
- **Class utilities**: CVA + clsx + tailwind-merge (shared via `@starterkit/shared`)

### Backend (`apps/backend`)

- **Runtime**: .NET 10
- **Language**: C#
- **APIs**: ASP.NET Core Web API (REST)
- **Database**: PostgreSQL via Entity Framework Core (Npgsql provider)
- **Authentication**: Firebase Auth (Mobile API) / Azure B2C (Web API)
- **Containerisation**: Docker (Linux containers)
- **Formatting**: CSharpier
- **Linting**: Roslyn Analysers + EditorConfig

---

## Commands

### Root (monorepo-wide)

```bash
npm run dev:expo              # Start Expo dev server
npm run dev:web               # Start Next.js dev server
npm run build:web             # Build Next.js for production
npm run lint                  # Check all workspaces with Biome
npm run lint:fix              # Auto-fix lint issues
npm run format                # Format all workspaces with Biome
npm run test                  # Run tests in all workspaces
npm run typecheck             # TypeScript type check all workspaces
npm run check                 # Run all checks (lint + typecheck + test)
npm run generate:proxy        # Regenerate Orval proxy in all workspaces
npm run spec:dashboard        # Open Spec-Driven Workflow approval dashboard
```

### Expo (`apps/expo`)

```bash
npm run start                 # Start Expo dev server
npm run test                  # Run Vitest
npm run typecheck             # TypeScript check
npm run generate:proxy        # Fetch schema + generate + format
npm run generate:proxy:local  # Generate from committed schema only
```

### Web (`apps/web`)

```bash
npm run dev                   # Start Next.js dev server (Turbopack)
npm run build                 # Production build
npm run test                  # Run Vitest
npm run typecheck             # TypeScript check
npm run generate:proxy        # Fetch schema + generate + format
npm run generate:proxy:local  # Generate from committed schema only
```

### Backend (`apps/backend`)

```bash
dotnet build                  # Build all projects
dotnet test                   # Run all test projects
dotnet csharpier .            # Format all C# files
dotnet csharpier --check .    # Check formatting (CI)
docker-compose up             # Start APIs + PostgreSQL containers
```

---

## Project Structure

```text
/                               # Monorepo root
├── apps/
│   ├── expo/                   # Mobile app (Expo + React Native)
│   │   ├── app/                # Expo Router — routing shells ONLY (no logic)
│   │   ├── components/ui/      # Design system primitives (CVA + cn())
│   │   ├── constants/          # tokens.ts (re-exports runtime tokens from @starterkit/shared), theme.ts
│   │   ├── src/
│   │   │   ├── features/       # Feature slices (auth, crossword, etc.)
│   │   │   ├── lib/            # Utilities (cn, http, storage)
│   │   │   ├── proxy/          # AUTO-GENERATED — Orval output (never hand-edit)
│   │   │   └── store/          # Zustand global stores
│   │   ├── openapi/            # Committed OpenAPI schemas
│   │   ├── test/               # Test infrastructure (factories, MSW, setup)
│   │   └── __tests__/          # Tests mirroring src/ structure 1:1
│   │
│   ├── web/                    # Web admin portal (Next.js + DevExtreme)
│   │   ├── src/
│   │   │   ├── app/            # Next.js App Router — routing shells ONLY
│   │   │   ├── components/ui/  # Minimal web UI primitives (Alert, Typography)
│   │   │   ├── features/       # Feature slices (auth, etc.)
│   │   │   ├── lib/            # Utilities (cn, http, providers)
│   │   │   ├── proxy/          # AUTO-GENERATED — Orval output (never hand-edit)
│   │   │   └── store/          # Zustand global stores
│   │   ├── openapi/            # Committed OpenAPI schemas
│   │   ├── test/               # Test infrastructure (factories, MSW, setup)
│   │   └── __tests__/          # Tests mirroring src/ structure 1:1
│   │
│   └── backend/                # Backend API (.NET 10)
│       ├── src/
│       │   ├── StarterKit.MobileApi    # ASP.NET Core Web API — mobile client
│       │   ├── StarterKit.WebApi       # ASP.NET Core Web API — web client
│       │   ├── StarterKit.Core         # Shared business logic class library
│       │   ├── StarterKit.Mcp          # Shared MCP server wiring (both APIs host /mcp)
│       │   └── StarterKit.Data         # EF Core + domain models + repositories
│       ├── tests/
│       │   ├── StarterKit.MobileApi.Tests
│       │   ├── StarterKit.WebApi.Tests
│       │   ├── StarterKit.Core.Tests
│       │   └── StarterKit.Data.Tests
│       └── StarterKit.slnx
│
├── packages/
│   ├── shared/                 # Shared utilities + design tokens (cn, error-message, ApiError, queryClient, tokens)
│   │   ├── tokens.css          # CSS primitive tokens (--starterkit-* variables) — imported by both app global CSS files
│   │   └── src/
│   │       ├── lib/            # cn.ts, error-message.ts, http/, tokens.ts (TypeScript runtime tokens)
│   │       └── index.ts        # Barrel export
│   └── icons/                  # Shared icon set (@starterkit/icons) — web uses react-icons, native uses @expo/vector-icons
│
├── docs/
│   └── standards/              # ← ALL coding rules live here (single source of truth)
├── .agents/skills/             # Shared AI agent skills
├── biome.json                  # Root Biome config (all workspaces inherit)
├── turbo.json                  # Turborepo task config
└── tsconfig.base.json          # Base TypeScript config
```

---

## Path Aliases

### Expo (`apps/expo`)

```text
@/           →  apps/expo/
@features/*  →  apps/expo/src/features/*
@lib/*       →  apps/expo/src/lib/*
@store/*     →  apps/expo/src/store/*
@starterkit/shared  →  packages/shared/src
```

### Web (`apps/web`)

```text
@/*          →  apps/web/src/*
@features/*  →  apps/web/src/features/*
@lib/*       →  apps/web/src/lib/*
@store/*     →  apps/web/src/store/*
@starterkit/shared  →  packages/shared/src
```

---

## Adding a New Feature

1. Create a spec via the `spec-workflow` MCP tools ("Create a spec for \<feature\>").
2. Complete the SDW: requirements → approve → design → approve → tasks → approve.
3. Create `src/features/<name>/` with 4 subdirectories + `README.md` in each.
4. Use `src/features/auth/` as the reference implementation.
5. Add the controller→datasource mapping row to `src/features/README.md`.

## Spec-Driven Workflow (SDW)

**Never start implementing a feature without an approved spec.**

The SDW is managed by the `spec-workflow` MCP server. All AI agents (Copilot, Claude Code,
Codex) share the same workflow tools and spec storage (`.spec-workflow/specs/`).

```text
Create spec → Requirements → Approve → Design → Approve → Tasks → Approve → Implement
```

Approval dashboard: run `npm run spec:dashboard` (or the VS Code task "Spec Dashboard").
Approvals must go through the dashboard — verbal approval is never accepted.
