import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

// ─── Credentials ──────────────────────────────────────────────────────────────
//
// Env override → committed local dev defaults. The fallbacks are the dev admin
// seeded into GoTrue by the migrator's SupabaseAuthSeeder — dev-only, committed
// in apps/backend/src/StarterKit.Migrator/Seeders/SupabaseAuthSeeder.cs — so a fresh
// clone runs the suite with no .env.e2e. CI / non-local runs override via
// E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (Key Vault, tag app=e2e).
export const E2E_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@starterkit.local';
export const E2E_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'P@ssword01*$';

// ─── Supabase (hosted) constants ──────────────────────────────────────────────
//
// Mirrors the app-side fallbacks (apps/web + apps/expo supabase config): the
// hosted "StarterKit Dev" project. SUPABASE_JWT_SECRET comes from the environment
// (playwright.config.ts loads apps/backend/.env, which /pull-secrets populates
// from Key Vault). Without it, synthetic tokens are signed with a placeholder —
// fine for the mocked expo suite, but they will NOT validate against a real
// backend (real-backend specs need the pulled secret).
// IMPORTANT: the storage key must be derived from the URL the EXPO APP BUNDLE
// was built with (supabase-js keys storage by hostname). playwright.config.ts
// loads apps/expo/.env.local so EXPO_PUBLIC_SUPABASE_URL reflects the app.
// Defaults mirror the app-side fallbacks: the LOCAL self-hosted stack (Kong
// gateway) and its committed public demo JWT secret — see infra/supabase.
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'http://localhost:8000';
const SUPABASE_JWT_SECRET =
  process.env.SUPABASE_JWT_SECRET || 'your-super-secret-jwt-token-with-at-least-32-characters-long';

/**
 * supabase-js persists its session in localStorage under
 * `sb-<first-hostname-label>-auth-token` (e.g. `sb-localhost-auth-token`).
 * Derived from the URL exactly like SupabaseClient does, so the injected
 * record is found by both the web app (localStorage) and the Expo web app
 * (AsyncStorage's web backend, which is a thin localStorage wrapper).
 */
export const SUPABASE_STORAGE_KEY = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;

const AUTH_DIR = path.resolve(__dirname, '../../.auth');

/** True when global-setup captured an authenticated web storageState. */
function hasCachedWebSession(): boolean {
  const file = path.join(AUTH_DIR, 'web.json');
  if (!fs.existsSync(file)) return false;
  try {
    return fs.readFileSync(file, 'utf-8').includes(SUPABASE_STORAGE_KEY);
  } catch {
    return false;
  }
}

/**
 * Navigates to /clubs as an authenticated admin.
 *
 * Preferred path: the storageState captured by global-setup (supabase-js keeps
 * its session in localStorage, which Playwright restores natively) already
 * authenticates the context — just navigate.
 *
 * Fallback: a full UI login when no session was captured (e.g. first run
 * before global-setup, or an auth spec that overrides storageState).
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  if (hasCachedWebSession()) {
    await page.goto('/clubs');
    return;
  }

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.fillAndSubmit(E2E_EMAIL, E2E_PASSWORD);
  await page.waitForURL(/.*clubs/, { timeout: 60_000 });
}

// ─── Synthetic (deterministic) Supabase auth ──────────────────────────────────
//
// LIVE-SAFE BY CONSTRUCTION. Authenticates expo-web specs with a session built
// entirely in the test harness — no real login, no GoTrue round-trip. Two
// pieces, both offline:
//   1. A well-formed Supabase session written into localStorage (far-future
//      expiry, so supabase-js never attempts a refresh). The access token is a
//      real HS256 JWT signed with the local demo JWT_SECRET, matching the
//      GoTrue contract (iss/aud/sub — see docs/standards/supabase.md), so it
//      even validates against a backend configured with the demo secret.
//   2. page.route mocks for `/auth/v1/*` so any stray SDK call (refresh,
//      user fetch, logout) resolves offline. The app's auth-initializer maps
//      session.user → AuthUser (clubId from app_metadata.club_id) →
//      authenticated. All `/api/*` calls are mocked by each spec's fixtures.

export interface SyntheticAuthUser {
  uid?: string;
  email?: string;
  displayName?: string;
  /** app_metadata.club_id claim — drives tenant context. `null` omits it
   *  (e.g. to exercise the no-club path). */
  clubId?: string | null;
}

interface ResolvedUser {
  uid: string;
  email: string;
  displayName: string;
  clubId: string | null;
}

function resolveSyntheticUser(user: SyntheticAuthUser): ResolvedUser {
  return {
    // GoTrue subs are UUIDs; RoleClaimsTransformer stores sub in ExternalAuthId.
    uid: user.uid ?? '00000000-0000-4000-8000-00000000e2e0',
    email: user.email ?? 'e2e@starterkit.test',
    displayName: user.displayName ?? 'E2E Tester',
    clubId: user.clubId === undefined ? 'e2e-club-1' : user.clubId,
  };
}

const base64url = (input: Buffer | string | Record<string, unknown>): string => {
  const buf =
    Buffer.isBuffer(input) || typeof input === 'string'
      ? Buffer.from(input as Buffer | string)
      : Buffer.from(JSON.stringify(input));
  return buf.toString('base64url');
};

function appMetadata(u: ResolvedUser): Record<string, unknown> {
  const metadata: Record<string, unknown> = { provider: 'email', providers: ['email'] };
  if (u.clubId) metadata.club_id = u.clubId;
  return metadata;
}

/** HS256-signed GoTrue access token matching the backend's validation contract. */
function buildAccessToken(u: ResolvedUser, expSec: number): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    iss: `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1`,
    sub: u.uid,
    aud: 'authenticated',
    role: 'authenticated',
    iat: nowSec,
    exp: expSec,
    email: u.email,
    phone: '',
    app_metadata: appMetadata(u),
    user_metadata: { name: u.displayName },
    session_id: 'e2e-synthetic-session',
  };
  const signingInput = `${base64url(header)}.${base64url(payload)}`;
  const signature = crypto
    .createHmac('sha256', SUPABASE_JWT_SECRET)
    .update(signingInput)
    .digest('base64url');
  return `${signingInput}.${signature}`;
}

/** The GoTrue user object embedded in the stored session (toUser reads
 *  user_metadata.name and app_metadata.club_id). */
function buildSessionUser(u: ResolvedUser): Record<string, unknown> {
  const nowIso = new Date().toISOString();
  return {
    id: u.uid,
    aud: 'authenticated',
    role: 'authenticated',
    email: u.email,
    email_confirmed_at: nowIso,
    phone: '',
    app_metadata: appMetadata(u),
    user_metadata: { name: u.displayName },
    identities: [],
    created_at: nowIso,
    updated_at: nowIso,
  };
}

/** Full supabase-js session record as persisted under SUPABASE_STORAGE_KEY. */
export function buildSyntheticSession(user: SyntheticAuthUser = {}): Record<string, unknown> {
  const u = resolveSyntheticUser(user);
  const expSec = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
  return {
    access_token: buildAccessToken(u, expSec),
    token_type: 'bearer',
    expires_in: 365 * 24 * 60 * 60,
    expires_at: expSec,
    refresh_token: 'e2e-synthetic-refresh-token',
    user: buildSessionUser(u),
  };
}

/** Mock the GoTrue endpoints so any stray SDK call resolves offline. */
async function mockGoTrueEndpoints(page: Page, session: Record<string, unknown>): Promise<void> {
  await page.route('**/auth/v1/**', (route) => {
    const url = route.request().url();
    if (url.includes('/auth/v1/token')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(session),
      });
    }
    if (url.includes('/auth/v1/user')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(session.user),
      });
    }
    if (url.includes('/auth/v1/logout')) {
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

/**
 * Inject a deterministic, non-expiring synthetic Supabase session (no real
 * login, no live GoTrue/backend contact — see the LIVE-SAFE note above). Call
 * in beforeEach for authenticated expo-web specs. Pass overrides for a specific
 * uid/email/name, or `clubId: null` to exercise the no-club path.
 */
export async function injectSyntheticExpoAuth(
  page: Page,
  user: SyntheticAuthUser = {},
): Promise<void> {
  const session = buildSyntheticSession(user);
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      window.localStorage.setItem(key, value);
    },
    { key: SUPABASE_STORAGE_KEY, value: JSON.stringify(session) },
  );
  await mockGoTrueEndpoints(page, session);
}

/**
 * Injects Expo Supabase auth for authenticated expo-web specs. Uses the
 * deterministic synthetic session (live-safe; never depends on a captured
 * login or a live round-trip).
 */
export async function injectExpoSupabaseAuth(
  page: Page,
  user: SyntheticAuthUser = {},
): Promise<void> {
  await injectSyntheticExpoAuth(page, user);
}
