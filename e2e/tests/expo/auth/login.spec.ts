/**
 * Login screen E2E — Expo web.
 *
 * Covers what the app actually ships: the email/password form, its client-side
 * validation, the reset-success banner, and the authed-user redirect. Email/password
 * is the only real auth (real GoTrue); the valid-login and wrong-password tests are
 * gated on .env.e2e credentials.
 *
 * Social sign-in (Google / Microsoft) and phone/OTP are NOT covered, because they are
 * not in the product yet: login-screen.tsx hides that entire section unless
 * EXPO_PUBLIC_SOCIAL_AUTH_ENABLED is exactly 'true', which no environment sets, and the
 * GoTrue providers behind it are not wired. The specs that used to cover them only
 * passed because CI set that flag purely for the test run — asserting UI no user can
 * reach. Bring them back with the feature, not before.
 *
 * Layout: the auth screen splits at 768px. The same testIDs serve both
 * layouts, so one POM works; layout-specific assertions branch on
 * page.viewportSize().
 */

import { expect, test } from '@playwright/test';
import { LoginPage } from '../../../expo/pages/login.page';
import { injectExpoSupabaseAuth } from '../../../playwright/utils/auth';

const E2E_EMAIL = process.env.E2E_ADMIN_EMAIL;
const E2E_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

/** Wide-web (split-panel) at ≥768px; stacked hero below. */
function isWideWeb(page: import('@playwright/test').Page): boolean {
  const vp = page.viewportSize();
  return (vp?.width ?? 0) >= 768;
}

test.describe('Login screen', () => {
  let loginPage: LoginPage;

  /* Login is logged-out — clear any stored auth session. */
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────
  test.describe('Email-mode rendering', () => {
    test('renders the email form with all fields', async () => {
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.submitButton).toBeVisible();
      await expect(loginPage.forgotPasswordLink).toBeVisible();
    });

    test('renders the correct layout for the viewport', async ({ page }) => {
      // gradientHero renders in every layout; the split-panel screenLayout
      // container is only present in the wide-web layout. waveDivider is not
      // part of the base login layout at all — it only renders inside
      // oauth-loading-overlay.tsx during an active OAuth sign-in, which this
      // test never triggers.
      await expect(loginPage.gradientHero).toBeVisible();
      if (isWideWeb(page)) {
        await expect(loginPage.screenLayout).toBeVisible();
      } else {
        await expect(loginPage.screenLayout).toHaveCount(0);
      }
    });
  });

  // ── Client-side validation ─────────────────────────────────────────────────
  test.describe('Email validation', () => {
    test('shows required errors for empty submit', async ({ page }) => {
      await loginPage.submit();
      await expect(page.getByText(/email or username is required/i)).toBeVisible();
      await expect(page.getByText(/password is required/i)).toBeVisible();
    });

    test('shows invalid-email error for a malformed email', async ({ page }) => {
      await loginPage.fillAndSubmit('not-an-email@', 'whatever');
      await expect(page.getByText(/valid email address/i)).toBeVisible();
    });

    test('accepts a username (no @) without an email-format error', async ({ page }) => {
      // Custom-auth users sign in with a username; the schema only validates
      // email format when an @ is present.
      await loginPage.fillForm('someusername', '');
      await loginPage.submit();
      await expect(page.getByText(/valid email address/i)).toHaveCount(0);
      await expect(page.getByText(/password is required/i)).toBeVisible();
    });
  });

  // ── Real email/password auth (gated on credentials) ────────────────────────
  test.describe('Email auth — real GoTrue', () => {
    test('signs in with valid credentials and redirects off login', async ({ page }) => {
      test.skip(!E2E_EMAIL || !E2E_PASSWORD, 'requires .env.e2e credentials');
      await loginPage.fillAndSubmit(E2E_EMAIL as string, E2E_PASSWORD as string);
      await expect(page).not.toHaveURL(/.*login/, { timeout: 55_000 });
    });

    test('shows an inline error for a wrong password', async ({ page }) => {
      test.skip(!E2E_EMAIL, 'requires .env.e2e admin email');
      await loginPage.fillAndSubmit(E2E_EMAIL as string, 'DefinitelyWrong!123');
      await expect(
        page.getByText(/invalid|incorrect|wrong|credentials|password/i).first(),
      ).toBeVisible({ timeout: 20_000 });
      await expect(page).toHaveURL(/.*login/);
    });

    test('shows an inline error for an unknown account', async ({ page }) => {
      test.skip(!E2E_EMAIL, 'requires .env.e2e to be configured');
      await loginPage.fillAndSubmit('nobody-1234567@starterkit-e2e.invalid', 'Whatever!123');
      await expect(
        page.getByText(/invalid|incorrect|not found|credentials|password/i).first(),
      ).toBeVisible({ timeout: 20_000 });
      await expect(page).toHaveURL(/.*login/);
    });
  });

  // ── Reset-success banner ───────────────────────────────────────────────────
  test('shows the reset-success banner when ?resetSuccess=1', async ({ page }) => {
    await loginPage.gotoResetSuccess();
    await expect(page.getByText(/successfully reset/i)).toBeVisible();
  });

  // Phone-mode and social-button coverage was removed with the flag-gated UI it
  // asserted — see the note at the top of this file.

  // ── Authed user hitting /(auth)/login is redirected to / ───────────────────
  test.describe('Authed redirect', () => {
    test('an authenticated user is redirected away from login', async ({ page }) => {
      // Inject a synthetic Supabase session; the (auth) layout redirects to /.
      await injectExpoSupabaseAuth(page);
      // Keep downstream tab APIs from erroring while routing settles.
      await page.route('**/api/**', (route) => route.fulfill({ status: 200, body: '[]' }));
      await page.goto('/(auth)/login');
      await expect(page).not.toHaveURL(/.*login/, { timeout: 15_000 });
    });
  });
});
