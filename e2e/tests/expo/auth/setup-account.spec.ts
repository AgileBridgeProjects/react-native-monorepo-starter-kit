/**
 * Account-setup / reset-via-link E2E — Expo web.
 *
 * Endpoints (docs/e2e/phase2-user-flows.md §1):
 *   - GET  /api/users/setup/validate?token=   (token validation on mount)
 *   - POST /api/users/setup/complete          (set the new password)
 *
 * Three token states are driven by the validate response:
 *   - no token query param        → invalidLink (no request fires)
 *   - validate in-flight          → validating (delayed response)
 *   - validate rejected           → tokenInvalid
 *   - validate ok                 → password form
 *
 * On success: purpose=reset → /login?resetSuccess=1, otherwise → /login.
 * Password must satisfy PASSWORD_COMPLEXITY; confirm must match.
 */

import { expect, test } from '@playwright/test';
import { SetupAccountPage } from '../../../expo/pages/setup-account.page';
import { fulfillJson } from '../../../playwright/utils/mock-routes';

const VALIDATE_ENDPOINT = '**/api/users/setup/validate**';
const COMPLETE_ENDPOINT = '**/api/users/setup/complete';

/** A password meeting the complexity rule (upper, lower, digit, special, >=8). */
const STRONG_PASSWORD = 'Str0ng!Pass';

test.describe('Account setup / reset link', () => {
  let setupPage: SetupAccountPage;

  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    setupPage = new SetupAccountPage(page);
  });

  // ── State 1: no token ──────────────────────────────────────────────────────
  test('shows the invalid-link state when no token is supplied', async () => {
    await setupPage.goto();
    await expect(setupPage.invalidLink).toBeVisible();
    await expect(setupPage.passwordInput).toHaveCount(0);
  });

  // ── State 2: validating (in-flight) ────────────────────────────────────────
  test('shows the validating state while the token is being checked', async ({ page }) => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(VALIDATE_ENDPOINT, async (route) => {
      await gate; // hold the response open so the validating view stays mounted
      return fulfillJson(route, { email: 'new@example.com', purpose: 'AccountSetup' });
    });

    await setupPage.goto('valid-token-123');
    await expect(setupPage.validating).toBeVisible();

    release?.();
    await expect(setupPage.passwordInput).toBeVisible({ timeout: 10_000 });
  });

  // ── State 3: token invalid ──────────────────────────────────────────────────
  test('shows the token-invalid state when validation fails', async ({ page }) => {
    await page.route(VALIDATE_ENDPOINT, (route) =>
      route.fulfill({ status: 400, contentType: 'application/json', body: '{}' }),
    );

    await setupPage.goto('expired-token');
    await expect(setupPage.tokenInvalid).toBeVisible({ timeout: 10_000 });
    await expect(setupPage.passwordInput).toHaveCount(0);
  });

  // ── Valid token → form ───────────────────────────────────────────────────
  test.describe('Valid token — password form', () => {
    test.beforeEach(async ({ page }) => {
      await page.route(VALIDATE_ENDPOINT, (route) =>
        fulfillJson(route, { email: 'new@example.com', purpose: 'AccountSetup' }),
      );
    });

    test('renders the password fields, rules and submit', async () => {
      await setupPage.goto('valid-token-123');
      await expect(setupPage.passwordInput).toBeVisible();
      await expect(setupPage.confirmPasswordInput).toBeVisible();
      await expect(setupPage.submitButton).toBeVisible();
      // The rules checklist only mounts once the password field has input.
      await setupPage.passwordInput.fill('a');
      await expect(setupPage.passwordRuleRow('minLength')).toBeVisible();
    });

    test('rejects a weak password (complexity)', async ({ page }) => {
      await setupPage.goto('valid-token-123');
      await setupPage.fillAndSubmit('weak', 'weak');
      await expect(page.getByText(/uppercase, lowercase, a digit/i)).toBeVisible();
    });

    test('rejects mismatched confirm password', async ({ page }) => {
      await setupPage.goto('valid-token-123');
      await setupPage.fillAndSubmit(STRONG_PASSWORD, 'Different!1');
      await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    });

    test('completes account setup and redirects to login', async ({ page }) => {
      await page.route(COMPLETE_ENDPOINT, (route) => fulfillJson(route, {}));

      await setupPage.goto('valid-token-123');
      await expect(setupPage.passwordInput).toBeVisible({ timeout: 10_000 });

      const [response] = await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes('/api/users/setup/complete') && r.status() === 200,
        ),
        setupPage.fillAndSubmit(STRONG_PASSWORD),
      ]);
      expect(response.ok()).toBe(true);
      await expect(page).toHaveURL(/.*login/, { timeout: 10_000 });
      // Account-setup (not reset) → no resetSuccess banner param.
      await expect(page).not.toHaveURL(/resetSuccess/);
    });
  });

  // ── Reset purpose → resetSuccess banner ────────────────────────────────────
  test('reset link completes and redirects to login?resetSuccess=1', async ({ page }) => {
    await page.route(VALIDATE_ENDPOINT, (route) =>
      fulfillJson(route, { email: 'reset@example.com', purpose: 'PasswordReset' }),
    );
    await page.route(COMPLETE_ENDPOINT, (route) => fulfillJson(route, {}));

    await setupPage.goto('reset-token-123', 'reset');
    await expect(setupPage.passwordInput).toBeVisible({ timeout: 10_000 });

    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/users/setup/complete') && r.status() === 200,
      ),
      setupPage.fillAndSubmit(STRONG_PASSWORD),
    ]);

    await expect(page).toHaveURL(/login.*resetSuccess=1/, { timeout: 10_000 });
    await expect(page.getByText(/successfully reset/i)).toBeVisible();
  });

  test('shows an error and stays on the form when completion fails', async ({ page }) => {
    await page.route(VALIDATE_ENDPOINT, (route) =>
      fulfillJson(route, { email: 'new@example.com', purpose: 'AccountSetup' }),
    );
    await page.route(COMPLETE_ENDPOINT, (route) =>
      route.fulfill({ status: 400, contentType: 'application/json', body: '{}' }),
    );

    await setupPage.goto('valid-token-123');
    await setupPage.fillAndSubmit(STRONG_PASSWORD);

    await expect(page.getByText(/something went wrong/i)).toBeVisible({ timeout: 10_000 });
    await expect(setupPage.passwordInput).toBeVisible();
    await expect(page).not.toHaveURL(/login/);
  });
});
