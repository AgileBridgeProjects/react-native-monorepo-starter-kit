import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load E2E-specific environment variables (test credentials, base URL, etc.)
// __dirname is set by Playwright's bundler to the config file's own directory.
dotenv.config({ path: path.resolve(__dirname, '.env.e2e') });
// Also load the expo app env — the synthetic-session storage key must be derived
// from the SAME Supabase URL the app bundle was built with
// (EXPO_PUBLIC_SUPABASE_URL). dotenv never overrides already-set keys, so
// .env.e2e and the ambient environment win over this file.
dotenv.config({ path: path.resolve(__dirname, '../apps/expo/.env.local') });

/**
 * Which dev servers to start. Playwright boots every entry in `webServer` regardless
 * of the selected project, so a web-only run would otherwise pay for Metro too.
 * `npm run e2e:affected` sets this from the selected specs; default keeps both.
 */
const requestedServers = process.env.E2E_SERVERS ?? 'both';
const startsWeb = requestedServers === 'both' || requestedServers === 'web';
const startsExpo = requestedServers === 'both' || requestedServers === 'expo';

/** `E2E_WORKERS` overrides the worker count/percentage; a plain integer is parsed to a number
 * since Playwright's `workers` option treats a bare numeric string differently from a count. */
const workersOverride = process.env.E2E_WORKERS;
const workers = workersOverride
  ? workersOverride.endsWith('%')
    ? workersOverride
    : Number(workersOverride)
  : '50%';

/**
 * Playwright configuration for all StarterKit E2E tests.
 *
 * Projects:
 *   - web       → Admin Portal (Next.js, http://localhost:3000)  tests/web/
 *   - expo-web  → Expo web view (Metro/static export, http://localhost:8081)  tests/expo/
 *
 * Prerequisites:
 *   - Next.js dev server: auto-started by webServer config below
 *   - Expo dev server (for expo-web locally): `npm run dev:expo` (port 8081)
 *   - Self-hosted Supabase stack running (npm run dev:backend)
 *   - E2E database running (see e2e/README.md) for full-stack tests
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  globalSetup: './playwright/global-setup.ts',

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* No retries locally — keep feedback fast. */
  retries: 0,

  /* Parallel across spec FILES (fullyParallel stays off, so tests within a file
   * keep their order and `test.describe.serial` CRUD chains stay on one worker).
   * Files are independent: mocked specs intercept only their own page's routes,
   * auth is a shared read-only storageState, and every real-backend CRUD file
   * uses its own `E2E-<prefix>-${Date.now()}` names — no cross-file state.
   * '50%' of cores keeps the single Next dev server / WebApi responsive, but on a
   * high-core-count box even that is enough concurrent load against the one shared
   * dev server + one shared WebApi/Postgres to turn real-backend CRUD specs flaky
   * (confirmed by A/B testing on a 28-core machine: 21 failures at 14 workers, 1-3 at
   * 1 worker, same specs, same containers). E2E_WORKERS lets a box like that clamp
   * further without changing the default for everyone else. */
  workers,

  /* Generous per-test timeout — loginAsAdmin may fall back to a real GoTrue login which can take
   * up to 30s in slow environments. The default 30s leaves no headroom for the
   * test body itself, causing intermittent beforeEach timeouts. */
  timeout: 60_000,

  /* Reporter — list for local, HTML for deeper inspection. */
  reporter: [['list'], ['html', { outputFolder: './html-report', open: 'never' }]],

  use: {
    /* Default base URL (admin portal). Overridden per project below. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',

    /* Collect trace on first retry (useful for debugging). */
    trace: 'on-first-retry',

    /* Screenshot on failure. */
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'web',
      testDir: './tests/web',
      use: {
        ...devices['Desktop Chrome'],
        /* Reuse the auth session saved in global-setup — no per-test auth round-trip.
         * Auth test files (login/register/otp) override this via test.use(). */
        storageState: path.join(__dirname, '.auth/web.json'),
      },
    },
    /* Expo web — the app uses width breakpoints (md=768) to switch layouts, so we run the
     * same specs across three viewport projects. Desktop ≥1024, tablet ≥768 (<1024 web-tablet
     * chrome), mobile <768. Specs that assert layout differences branch on page.viewportSize(). */
    {
      name: 'expo-web',
      testDir: './tests/expo',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        baseURL: 'http://localhost:8081',
        storageState: path.join(__dirname, '.auth/expo.json'),
      },
    },
    {
      name: 'expo-web-tablet',
      testDir: './tests/expo',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 834, height: 1112 },
        baseURL: 'http://localhost:8081',
        storageState: path.join(__dirname, '.auth/expo.json'),
      },
    },
    {
      name: 'expo-web-mobile',
      testDir: './tests/expo',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        baseURL: 'http://localhost:8081',
        storageState: path.join(__dirname, '.auth/expo.json'),
      },
    },
  ],

  /* Auto-start dev servers if not already running.
   * reuseExistingServer: true means no second instance is started if you
   * already have it running manually — best of both worlds.
   *
   * NOTE: The backend (.NET / Docker) is NOT auto-started here because it
   * requires Azure Key Vault credentials and a .env file to boot. Start it
   * manually with `npm run dev:backend` before running tests that need it.
   * Tests will warn (not fail) if the backend is unreachable. */
  webServer: [
    ...(startsWeb
      ? [
          {
            command: 'npm run dev:web',
            url: 'http://localhost:3000',
            reuseExistingServer: true,
            cwd: path.resolve(__dirname, '..'),
            timeout: 120000,
            stdout: 'pipe' as const,
            stderr: 'pipe' as const,
            env: {
              // Point the portal at the isolated E2E backend (run-e2e.sh brings up
              // webapi-e2e on :5003 against an ephemeral local Postgres) so real-backend
              // CRUD specs never touch the shared hosted dev database. Without this the
              // app falls back to :5002 (the main stack → hosted dev DB).
              NEXT_PUBLIC_API_URL: 'http://localhost:5003',
            },
          },
        ]
      : []),
    ...(startsExpo
      ? [
          {
            command: 'npx expo start --web --non-interactive --port 8081',
            url: 'http://localhost:8081',
            reuseExistingServer: true,
            cwd: path.resolve(__dirname, '..', 'apps', 'expo'),
            timeout: 120000,
            stdout: 'pipe' as const,
            stderr: 'pipe' as const,
            env: {
              // The suite exercises the real login screen + injected sessions — the
              // dev auth bypass must be OFF regardless of the machine's local env
              // files (process env outranks all .env* files in Expo).
              EXPO_PUBLIC_BYPASS_AUTH: 'false',
            },
          },
        ]
      : []),
  ],
});
