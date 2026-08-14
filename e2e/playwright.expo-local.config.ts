import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// The synthetic auth injector (playwright/utils/auth.ts) derives its localStorage key from
// EXPO_PUBLIC_SUPABASE_URL, and that key must match the one the running Metro server's bundle
// computes — which depends on whatever apps/expo/.env.local held when that server started.
// Without this load, a .env.local pointed at a non-default Supabase URL (e.g. a LAN IP for
// physical-device testing) silently mismatches auth.ts's `http://localhost:8000` fallback, and
// every spec needing an authenticated screen times out waiting for it — same load
// playwright.config.ts already does, for the same reason. dotenv never overrides an
// already-set key, so CI's own env (which builds the static export it serves) still wins.
dotenv.config({ path: path.resolve(__dirname, '../apps/expo/.env.local') });

/**
 * Local expo-web run config — runs ONLY the Expo specs against an already-running
 * Metro web server on http://localhost:8081 (`npm run dev:expo`), with NO global-setup
 * and NO Next.js webServer. Auth is provided per-spec by the synthetic injector
 * (`injectExpoSupabaseAuth` → `injectSyntheticExpoAuth`), so no captured session or
 * credentials are needed. Use for fast local iteration:
 *
 *   npx playwright test --config=playwright.expo-local.config.ts tests/expo/<feature>
 *
 * The CI **Playwright (Expo Web)** job (`.github/workflows/e2e.yml`) also uses this
 * config — it builds the static web export, serves it on :8081, then runs here with
 * `--reporter=list,json,html`. The admin-portal (web) job still uses `playwright.config.ts`
 * (which starts both servers + global-setup with a real GoTrue login).
 */
export default defineConfig({
  testDir: './tests/expo',
  outputDir: './test-results',
  retries: 0,
  /* Parallel across spec files — every expo spec is self-contained (synthetic
   * injected auth + per-spec route mocks, no backend), so file-level parallelism
   * is safe by construction. Cuts the 3-viewport CI matrix down proportionally. */
  workers: '50%',
  timeout: 45_000,
  reporter: [['list']],
  use: {
    // `e2e:affected` builds its own static export and serves it, falling back to a second
    // port when a dev server already owns 8081 — it passes the chosen origin through here.
    // Unset everywhere else (CI serves on 8081; direct `npx playwright test` runs against
    // `npm run dev:expo`), so the default is unchanged.
    baseURL: process.env.E2E_EXPO_BASE_URL ?? 'http://localhost:8081',
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'expo-web',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'expo-web-tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 834, height: 1112 } },
    },
    {
      name: 'expo-web-mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
  ],
});
