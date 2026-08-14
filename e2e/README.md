# E2E Testing — Local Development

End-to-end tests for the StarterKit platform using **Playwright** (Admin Portal / Next.js) and
**Maestro** (Mobile / Expo). Tests run locally during development and automatically via
the CI E2E pipeline (see [CI/CD](#cicd--e2e-pipeline) below).

---

## Prerequisites

| Tool | Version | Required for |
|---|---|---|
| Docker Desktop | Latest | All suites (ephemeral DB) |
| Node.js | ≥ 22 | All |
| Playwright browsers | Latest | Playwright — `cd e2e && npm run playwright:install` |
| Maestro CLI | Latest | Maestro — [maestro.mobile.dev/getting-started](https://maestro.mobile.dev/getting-started/installing-maestro) |
| Physical device, Android emulator, or iOS simulator | — | Maestro |

> **Maestro requires Docker + backend**: Maestro flows exercise API-backed screens after auth, so the DB containers and backend API (`npm run dev:backend`) must be running before executing any Maestro suite.

### One-time setup

```bash
# From monorepo root
cd e2e
npm install                  # Install Playwright + dependencies
npm run playwright:install   # Download Chromium browser binary
cp .env.e2e.example .env.e2e # Create credentials file
# Edit .env.e2e and fill in your test user credentials
```

For Maestro, follow the [official install guide](https://maestro.mobile.dev/getting-started/installing-maestro):

```bash
# macOS / Linux
curl -Ls "https://get.maestro.mobile.dev" | bash

# Windows (via WSL2 or Git Bash)
curl -Ls "https://get.maestro.mobile.dev" | bash
```

---

## Running E2E Tests

### Option 1: Full orchestrated run (recommended)

The orchestration script handles the entire lifecycle: start DB → migrate → seed → test → teardown.

```bash
# Run all suites (Playwright + Maestro)
bash e2e/scripts/run-e2e.sh

# Run Playwright only (Admin Portal)
bash e2e/scripts/run-e2e.sh playwright

# Run Maestro only (Mobile)
bash e2e/scripts/run-e2e.sh maestro
```

**Before running**, ensure the required dev servers are up:

- **Playwright**: `npm run dev:web` (Next.js on <http://localhost:3000>)
- **Maestro**: `npm run dev:expo` + emulator/simulator running

### Option 2: Run suites independently

#### Playwright (Admin Portal)

```bash
cd e2e
npx playwright test                    # Headless
npx playwright test --headed           # Watch in browser
npx playwright test --ui               # Interactive UI mode
```

#### Maestro (Mobile)

```bash
# Single flow (pass credentials as env vars)
E2E_ADMIN_EMAIL=admin@starterkit.local E2E_ADMIN_PASSWORD='P@ssword01*$' \
  E2E_REGISTER_EMAIL="e2e-$(date +%s)@starterkit.local" \
  maestro test e2e/maestro/auth/login.yaml

# All flows
E2E_ADMIN_EMAIL=admin@starterkit.local E2E_ADMIN_PASSWORD='P@ssword01*$' \
  E2E_REGISTER_EMAIL="e2e-$(date +%s)@starterkit.local" \
  maestro test e2e/maestro/

# Physical iPhone with Expo dev client (connect via USB first)
maestro test --device <udid> e2e/maestro/auth/login.yaml
```

> **Physical iPhone**: Connect your iPhone via USB, ensure it's trusted, and have the
> Expo dev client open and connected. Maestro auto-detects the device. Use
> `xcrun xctrace list devices` (Mac) to find the UDID if needed.

### Option 3: Database only (for manual testing)

```bash
# Start the E2E database
docker compose -f e2e/docker-compose.e2e.yml -p starterkit-e2e up -d --wait

# Tear down when done
docker compose -f e2e/docker-compose.e2e.yml -p starterkit-e2e down -v
```

The E2E database uses **different ports** to avoid clashing with the main dev compose:

| Service | E2E Port | Dev Port |
|---|---|---|
| PostgreSQL | 15432 | 5432 |

Connection string for local API testing against E2E DB:

```text
Host=localhost;Port=15432;Database=starterkit_e2e;Username=postgres;Password=e2epostgres
```

---

## Architecture

```text
e2e/
├── .env.e2e                   # Test credentials (git-ignored)
├── .env.e2e.example           # Template for credentials
├── docker-compose.e2e.yml     # Ephemeral DB containers (Postgres/pgvector)
├── package.json               # Playwright + dotenv dependencies
├── playwright.config.ts       # Playwright configuration (loads .env.e2e)
├── playwright/
│   ├── selectors.ts           # Shared test IDs (single source of truth)
│   ├── pages/
│   │   ├── login.page.ts      # Page Object Model — login
│   │   └── register.page.ts   # Page Object Model — register
│   └── tests/
│       └── auth/
│           ├── login.spec.ts   # Full login flow (validation + GoTrue auth)
│           └── register.spec.ts# Full register flow (validation + GoTrue auth)
├── maestro/
│   ├── config.yaml            # Shared appId
│   ├── shared/
│   │   ├── fill-login-form.yaml
│   │   └── fill-register-form.yaml
│   └── auth/
│       ├── login.yaml         # Mobile login flow (GoTrue auth)
│       └── register.yaml      # Mobile register flow (GoTrue auth)
├── scripts/
│   ├── run-e2e.sh             # Full lifecycle orchestration
│   └── report-failures.ts     # CI: parse results → create Linear bug tickets
└── README.md                  # This file
```

### Database lifecycle

1. **Spin up** — Docker Compose starts Postgres/pgvector (no persistent volumes)
2. **Migrate** — The migrator container applies EF Core migrations + built-in seeders
3. **Seed** — the migrator’s built-in seeders create the deterministic dev data
4. **Test** — Playwright and/or Maestro run against the seeded database
5. **Tear down** — `docker compose down -v` removes containers and volumes (always, even on failure)

### Auth approach

E2E tests authenticate against the **local self-hosted Supabase stack** (`npm run dev:backend`, GoTrue via Kong on :8000). Local runs need no credentials at all — the harness defaults to the migrator-seeded dev admin and the committed demo JWT secret.
Test credentials are stored in `e2e/.env.e2e` (git-ignored) and loaded automatically.

**Login tests**: Sign in with the seeded admin user → assert redirect to the authenticated
landing page (`/companies` on web, `(tabs)` home screen on mobile).

**Register tests**: Create a new user with a unique timestamped email → assert redirect
away from the register screen. These users accumulate in the local GoTrue `auth.users` table and can
be cleaned up by resetting the local stack (`docker compose down -v`).

**Invalid credentials tests**: Submit wrong password → assert error toast/alert appears.

Client-side validation (empty fields, invalid email, password mismatch) is also tested as
a baseline, but the real value comes from the full auth round-trip tests.

### AI-dependent flows

**Decision: Mock stubs preferred.**

AI-dependent flows (e.g. game generation) are not part of the initial auth E2E scope. When
AI flows are added to E2E tests, the recommended approach is:

1. **Mock stubs** (default) — Intercept AI API calls at the network level and return canned
   responses. Keeps tests fast, deterministic, and cost-free.
2. **Cheap model fallback** — Route to GPT-4o-mini only for flows that cannot be meaningfully
   mocked (e.g. testing that AI output renders correctly in the UI).

This decision is revisited when AI E2E flows are implemented.

---

## CI/CD — E2E Pipeline

E2E tests run automatically via the **E2E** GitHub Actions workflow
(`.github/workflows/e2e.yml`). Triggers are tuned to balance coverage against
GitHub-minutes:

- **Weekly sweep** — `schedule` Mon 07:00 UTC, against `dev`. Runs both suites
  (web + expo) and, on failure, opens **Linear bug tickets**. Change-gated: a
  job is skipped if nothing in its paths changed in the last 8 days.
- **dev→uat promotion gate** — `pull_request` targeting `uat`. Runs the hardened
  **Expo suite** (synthetic auth, 3 viewports) as a merge check. Failures block
  the promotion and are visible in the PR, so no tickets are opened here. The
  heavy admin-portal (web) suite is intentionally **not** part of the gate.
  > To make this actually block a merge, add **Playwright (Expo Web)** as a
  > required status check on the `uat` branch protection rule.
- **Manual** — `workflow_dispatch` runs both suites in full (no change gate).

Suites:

- **Playwright (Web)** — spins up E2E DB containers + backend + Azure Key Vault
  and runs the admin-portal specs. Weekly sweep / manual only.
- **Playwright (Expo Web)** — builds the static web export, serves it on `:8081`,
  and runs `playwright.expo-local.config.ts` (synthetic Supabase auth, no
  global-setup / no credentials) across desktop + tablet + mobile viewports.
  Real-GoTrue email specs fall back to the seeded dev admin credentials.
- **Failure reporting** (sweep / manual only): `e2e/scripts/report-failures.ts`
  parses each job's JSON results and, for each new failure, creates a **Linear
  bug ticket** with `Bug` + `e2e-regression` labels. Each ticket is:
  - **assigned** by blaming the failing spec file (`git log`) and resolving the
    committer to a Linear user *live* (no hardcoded map) — falling back to the
    E2E owner (`E2E_FALLBACK_ASSIGNEE`) so nothing is left unassigned;
  - **added to the team's active cycle** so it shows up in the current sprint;
  - **de-duped** — a failure that already has a still-open ticket is skipped.

### Required GitHub Secrets / Vars

| Secret / Var | Used by | Description |
|---|---|---|
| `LINEAR_API_KEY` | report-failures | Linear personal API key — generate at [linear.app/settings/api](https://linear.app/settings/api) |
| `AZURE_CLIENT_ID` / `AZURE_TENANT_ID` / `AZURE_SUBSCRIPTION_ID` | Playwright (Web) | OIDC login used to read E2E secrets from Key Vault |
| `KEYVAULT_NAME` (repo **variable**) | Playwright (Web) | Key Vault holding secrets tagged `app=e2e` (admin creds) |

> The **Expo** suite needs no secrets — it uses synthetic Supabase auth. The
> admin-portal (web) suite pulls its admin credentials from Key Vault
> at runtime rather than from GitHub Secrets.
>
> **Note**: The E2E DB containers use fixed local-dev passwords (`e2epostgres`) which
> are intentionally committed — they are ephemeral, never exposed to the internet, and contain
> no real data. They do **not** require GitHub Secrets.

---

## Troubleshooting

### Docker containers won't start

- Ensure Docker Desktop is running
- Check no other containers are using ports 11433 or 15432: `docker ps`
- Force cleanup: `docker compose -f e2e/docker-compose.e2e.yml -p starterkit-e2e down -v --remove-orphans`

### Playwright can't connect to the app

- Verify Next.js dev server is running: `npm run dev:web`
- Check the base URL matches (default: <http://localhost:3000>)
- Override: `PLAYWRIGHT_BASE_URL=http://localhost:3001 npx playwright test`

### Maestro can't find the app

- Ensure the Expo dev server is running: `npm run dev:expo`
- Verify the emulator/simulator is visible: `adb devices` (Android) or check Xcode
- The app must be installed on the device with bundle ID `com.example.starterkit`

### Migrator fails

- Check Docker logs: `docker compose -f e2e/docker-compose.e2e.yml -p starterkit-e2e logs migrator-e2e`
- Ensure the backend builds successfully: `cd apps/backend && dotnet build`
