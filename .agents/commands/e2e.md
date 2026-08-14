# e2e — Run E2E Tests

Run the full E2E test suite (Playwright for web, Maestro for mobile, or both).
Handles prerequisite checks, environment setup, and orchestration.

---

## Input

The user can optionally specify a suite: `/e2e playwright`, `/e2e expo` (or `/e2e maestro`), or `/e2e all` (default).

`expo` and `maestro` are interchangeable — both run the Maestro mobile flows.

---

## Workflow

### 1. Prerequisites Check

Verify the following are running/available before starting tests:

| Prerequisite | Check command | Required for |
|---|---|---|
| Docker Desktop | `docker info` | All suites |
| Backend API running | `curl -s http://localhost:5000/health` | All suites |
| Next.js dev server | `curl -s http://localhost:3000` | Playwright |
| Expo dev client on device | Ask user to confirm | Maestro |
| Maestro CLI | `maestro --version` | Maestro |
| Playwright browsers | `npx playwright install --dry-run` | Playwright |

If a prerequisite is missing, offer to start it:
- **Next.js**: `cd apps/web && npm run dev`
- **Playwright browsers**: `cd e2e && npx playwright install chromium`
- **Docker**: Tell user to start Docker Desktop manually
- **Backend**: `npm run dev:backend` from the monorepo root (requires Docker DB containers first)

### 2. Environment Setup

Load credentials from `e2e/.env.e2e`. If the file doesn't exist, ask the user
for `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD` and create it.

### 3. Database Setup (required for all suites)

Start the ephemeral E2E database containers. Required for **both** Playwright and Maestro — Playwright hits the web API and Maestro flows exercise API-backed screens after auth.

```bash
cd e2e
docker compose -f docker-compose.e2e.yml -p starterkit-e2e up -d --wait postgres-e2e
docker compose -f docker-compose.e2e.yml -p starterkit-e2e up migrator-e2e --build --abort-on-container-exit
docker compose -f docker-compose.e2e.yml -p starterkit-e2e exec -T -e PGPASSWORD='E2eTestP@ssw0rd!' postgres-e2e \
  psql -U postgres -d starterkit -f - < seed/seed.sql
```

### 4. Run Playwright Tests

```bash
cd e2e && npx playwright test --config playwright.config.ts
```

If tests fail:
1. Show the failure output
2. Offer to open the HTML report: `npx playwright show-report ./playwright/html-report`
3. Offer to run in headed mode for visual debugging: `npx playwright test --headed`
4. Offer to run a specific failing test: `npx playwright test -g "test name"`

### 5. Run Maestro Tests (Physical iPhone / Emulator)

#### Step 1 — Start the backend API (if not already running)

The backend must be running so Maestro flows can hit API-backed screens after auth.

```bash
npm run dev:backend
```

Wait until the API is healthy: `curl -s http://localhost:5000/health`

#### Step 2 — Start the Expo dev server (if not already running)

Tell the user to run this in a terminal:

```bash
npm run dev:expo
```

#### Step 2 — Auto-run Maestro

Attempt to run:

```bash
cd e2e && npm run maestro
```

**If it succeeds:** ✓ Maestro flows are running. Wait for completion and report results.

**If it fails** with errors like `No devices found`, `app not running`, or connection timeouts:

Guide the user:

> The app isn't open on the emulator yet. Please do this:
> 
> 1. **In your Expo terminal**, press `s` to switch to Expo Go mode (if it says "Using development build")
> 2. **Press `a`** to open on the Android emulator
> 3. Wait for the Sign in screen to appear on the device (~5–10 seconds)
> 4. Once visible, I'll automatically retry Maestro

Then retry the Maestro command once the user confirms the Sign in screen is visible.

### 6. Teardown

After tests complete, tear down the E2E database containers:

```bash
docker compose -f e2e/docker-compose.e2e.yml -p starterkit-e2e down -v --remove-orphans
```

### 7. Report Results

Summarize:
- Total tests run / passed / failed for each suite
- Any flaky tests or known issues
- Link to HTML report (Playwright)

---

## Quick Reference

| Action | Command |
|---|---|
| Run all E2E | `bash e2e/scripts/run-e2e.sh all` |
| Playwright only | `cd e2e && npx playwright test` |
| Playwright headed | `cd e2e && npx playwright test --headed` |
| Playwright UI mode | `cd e2e && npx playwright test --ui` |
| Maestro all flows | `cd e2e && npm run maestro` |
| Maestro single flow | `cd e2e && npm run maestro:flow -- maestro/auth/login.yaml` |
| DB containers up | `docker compose -f e2e/docker-compose.e2e.yml -p starterkit-e2e up -d --wait` |
| DB teardown | `docker compose -f e2e/docker-compose.e2e.yml -p starterkit-e2e down -v` |
