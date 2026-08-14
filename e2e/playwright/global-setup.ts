import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { LoginPage as ExpoLoginPage } from '../expo/pages/login.page';
import { LoginPage as WebLoginPage } from './pages/login.page';
import { E2E_EMAIL, E2E_PASSWORD } from './utils/auth';

/**
 * Playwright global setup — runs once before all tests.
 *
 * 1. Checks optional prerequisites (backend API).
 * 2. Logs in once for the web project and once for the expo-web project,
 *    saving the auth storage state so individual tests never re-authenticate.
 *
 * supabase-js persists its session in localStorage (web) / AsyncStorage's
 * localStorage web backend (expo-web), both of which Playwright's
 * storageState() captures natively — no extra persistence dance needed.
 *
 * Credentials come from E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD, falling back to
 * the committed dev admin seeded into GoTrue by the migrator
 * (SupabaseAuthSeeder) — so a fresh clone with the local stack running
 * (`npm run dev:backend`) authenticates with no .env.e2e at all.
 */
export default async function globalSetup() {
  await checkBackend();
  ensureAuthDir();

  // Only log in against servers that were actually started (see E2E_SERVERS in
  // playwright.config.ts). Attempting the other one just prints a scary warning.
  const servers = process.env.E2E_SERVERS ?? 'both';
  if (servers === 'both' || servers === 'web') await setupWebAuth();
  else ensureStateFile('web.json');
  if (servers === 'both' || servers === 'expo') await setupExpoAuth();
  else ensureStateFile('expo.json');
}

const AUTH_DIR = path.resolve(__dirname, '../.auth');

function ensureAuthDir() {
  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
}

async function checkBackend() {
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:5002/healthz';
  try {
    const response = await fetch(backendUrl, { signal: AbortSignal.timeout(3000) });
    if (response.ok) {
      console.log('\n[e2e] ✓ Backend API is running');
    } else {
      console.warn(
        `\n[e2e] ⚠ Backend API responded with ${response.status} — data-dependent tests may fail`,
      );
    }
  } catch {
    console.warn(
      `\n[e2e] ⚠ Backend API not reachable at ${backendUrl}` +
        '\n      Start it with: npm run dev:backend' +
        '\n      Auth and form tests will still pass.\n',
    );
  }
}

async function setupWebAuth() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
  });
  const page = await context.newPage();
  try {
    const loginPage = new WebLoginPage(page);
    await loginPage.goto();
    await loginPage.fillAndSubmit(E2E_EMAIL, E2E_PASSWORD);
    await page.waitForURL(/.*clubs/, { timeout: 60_000 });
    // Let the in-flight auth/profile XHRs settle before capturing storage.
    // 5s cap: the app polls, so 'networkidle' may never fire — the catch below
    // makes this a bounded grace period, not a hard wait.
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
    await context.storageState({ path: path.join(AUTH_DIR, 'web.json') });
    console.log('\n[e2e] ✓ Web auth state saved');
  } catch (err) {
    writeEmptyState('web.json');
    console.warn(
      `\n[e2e] ⚠ Web login failed — authenticated web specs will fall back to UI login.` +
        `\n      Is the stack up (npm run dev:backend) and the GoTrue dev admin seeded?` +
        `\n      ${err instanceof Error ? err.message : err}\n`,
    );
  } finally {
    await browser.close();
  }
}

async function setupExpoAuth() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: 'http://localhost:8081' });
  const page = await context.newPage();
  try {
    const loginPage = new ExpoLoginPage(page);
    await loginPage.goto();
    await loginPage.fillAndSubmit(E2E_EMAIL, E2E_PASSWORD);
    await page.waitForURL((url) => !url.pathname.includes('login'), { timeout: 60_000 });
    // Same bounded grace period as the web setup above.
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
    await context.storageState({ path: path.join(AUTH_DIR, 'expo.json') });
    console.log('\n[e2e] ✓ Expo auth state saved');
  } catch (err) {
    writeEmptyState('expo.json');
    console.warn(
      `\n[e2e] ⚠ Expo login failed — expo specs use the synthetic injected session instead.` +
        `\n      ${err instanceof Error ? err.message : err}\n`,
    );
  } finally {
    await browser.close();
  }
}

/** Keeps Playwright's storageState config from throwing ENOENT on fresh clones. */
function writeEmptyState(filename: string) {
  fs.writeFileSync(path.join(AUTH_DIR, filename), JSON.stringify({ cookies: [], origins: [] }));
}

/** Same, but never clobbers a session captured by an earlier run of the other suite. */
function ensureStateFile(filename: string) {
  if (!fs.existsSync(path.join(AUTH_DIR, filename))) writeEmptyState(filename);
}
