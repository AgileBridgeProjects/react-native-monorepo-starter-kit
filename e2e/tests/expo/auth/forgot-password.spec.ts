/**
 * Forgot-password E2E — Expo web.
 *
 * Flow facts (docs/e2e/phase2-user-flows.md §1):
 *   - POST /api/users/setup/password-reset/request
 *   - OWASP: the success card always shows on settle, regardless of whether the
 *     email exists (we mock both 200 and 404 → both show success).
 *   - Custom-auth domains (@customauth.starterkitapp.internal) are rejected
 *     client-side with `emailNotEligible` — no request fires.
 */

import { expect, test } from '@playwright/test';
import { ForgotPasswordPage } from '../../../expo/pages/forgot-password.page';
import { fulfillJson } from '../../../playwright/utils/mock-routes';

const RESET_ENDPOINT = '**/api/users/setup/password-reset/request';

test.describe('Forgot password', () => {
  let forgotPage: ForgotPasswordPage;

  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    forgotPage = new ForgotPasswordPage(page);
    await forgotPage.goto();
  });

  test('renders the email field, submit and back button', async () => {
    await expect(forgotPage.emailInput).toBeVisible();
    await expect(forgotPage.submitButton).toBeVisible();
    await expect(forgotPage.backButton).toBeVisible();
  });

  test('back button returns to login', async ({ page }) => {
    await forgotPage.goBack();
    await expect(page).toHaveURL(/.*login/, { timeout: 5_000 });
  });

  // ── Validation ───────────────────────────────────────────────────────────
  test('requires an email', async ({ page }) => {
    await forgotPage.submit();
    await expect(page.getByText(/email address is required/i)).toBeVisible();
  });

  test('rejects a malformed email', async ({ page }) => {
    await forgotPage.fillAndSubmit('not-an-email');
    await expect(page.getByText(/valid email address/i)).toBeVisible();
  });

  test('rejects a custom-auth (username) account domain', async ({ page }) => {
    let requestFired = false;
    await page.route(RESET_ENDPOINT, (route) => {
      requestFired = true;
      return fulfillJson(route, { resetLink: null });
    });

    await forgotPage.fillAndSubmit('someuser@customauth.starterkitapp.internal');

    await expect(page.getByText(/not available for username accounts/i)).toBeVisible();
    await expect(forgotPage.successCard).toBeHidden();
    expect(requestFired).toBe(false);
  });

  // ── OWASP always-success ───────────────────────────────────────────────────
  test('shows the success card for a registered email (200)', async ({ page }) => {
    await page.route(RESET_ENDPOINT, (route) => fulfillJson(route, { resetLink: null }));

    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/users/setup/password-reset/request') && r.status() === 200,
      ),
      forgotPage.fillAndSubmit('registered@example.com'),
    ]);
    expect(response.ok()).toBe(true);
    await expect(forgotPage.successCard).toBeVisible();
    await expect(page.getByText(/check your email/i)).toBeVisible();
  });

  test('still shows the success card when the email is unknown (404 / OWASP)', async ({ page }) => {
    // OWASP: never reveal whether the email exists — the screen shows success
    // on settle regardless of the response status.
    await page.route(RESET_ENDPOINT, (route) =>
      route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }),
    );

    await forgotPage.fillAndSubmit('unknown@example.com');
    await expect(forgotPage.successCard).toBeVisible({ timeout: 10_000 });
  });

  test('shows the success card even when the request errors (500 / OWASP)', async ({ page }) => {
    await page.route(RESET_ENDPOINT, (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
    );

    await forgotPage.fillAndSubmit('boom@example.com');
    await expect(forgotPage.successCard).toBeVisible({ timeout: 10_000 });
  });
});
