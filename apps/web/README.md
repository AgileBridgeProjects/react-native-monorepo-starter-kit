# 🖥️ StarterKit Web

Admin portal built with **Next.js 16** (App Router + Turbopack).

---

## 🚀 Getting Started

### Prerequisites

- Node.js 22+, npm 10+
- Azure CLI — `az login` required for Key Vault access

### Setup

```bash
# From repo root
npm install

# Pull secrets from Key Vault into .env.local (DevExtreme license key etc.)
az login          # skip if already authenticated
npm run pull:env  # run from apps/web/
```

The API URL defaults to `http://localhost:5002` in code — no env override needed for local dev.

The backend must be running at `localhost:5001` (MobileApi) / `localhost:5002` (WebApi). See [apps/backend/README.md](../backend/README.md).

---

## 🧰 Commands

```bash
npm run dev             # Start dev server (Turbopack)
npm run build           # Production build
npm run test            # Run Vitest
npm run test:watch      # Vitest in watch mode
npm run typecheck       # TypeScript check
npm run check           # All checks (lint + typecheck + test)
npm run pull:env        # Pull secrets from Key Vault into .env.local
npm run generate:proxy  # Fetch OpenAPI spec + regenerate proxy client
```

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Styling | Tailwind CSS v4 (CSS-first tokens in `globals.css`) |
| UI Components | DevExtreme (grids, charts, forms, schedulers) |
| HTTP | Axios (generated Orval proxy client) |
| Auth | Firebase Auth (client) + Azure B2C |
| Testing | Vitest + Testing Library + jsdom |
| Linting | Biome |
| Shared code | `@starterkit/shared` — `cn()`, `getErrorMessage()`, `ApiError` |

---

## 🏛️ Architecture

Follows Clean Architecture with feature-based vertical slices. See [docs/architecture.md](../../docs/architecture.md).

```text
src/
  app/             # Next.js App Router — layouts and page shells only
  features/        # Bounded contexts (one folder per domain feature)
  components/ui/   # Shared design-system components
  lib/             # HTTP client, utilities
  store/           # Zustand global stores
  proxy/           # Auto-generated Orval API client (do not edit)
```

- Design tokens live in CSS variables in `src/app/globals.css` — each app owns its own tokens
- DevExtreme pages must be wrapped in `<DevExtremeProvider>` (client-only)
- Shared utilities (`cn`, `getErrorMessage`) re-export from `@starterkit/shared`

---

## 🔐 Environment & Secrets

Secrets are managed in **Azure Key Vault** (`kv-starterkit-dev`). Secrets tagged `app=web local=true` are pulled locally; all `app=web` secrets are injected by CI at build time.

Run after cloning and whenever secrets change:

```bash
npm run pull:env
```

**Adding a new secret** that should work locally and in CI:

```bash
az keyvault secret set --vault-name kv-starterkit-dev \
  --name <kebab-name> --value <value> \
  --tags app=web env=dev local=true
```

Omit `local=true` for CI-only secrets (e.g. deployed API URLs).

---

## 📚 Documentation

- [Architecture](../../docs/architecture.md)
- [Design System](../../docs/design-system.md)
- [Contributing](../../docs/contributing.md)
- [Standards](../../docs/standards/)
