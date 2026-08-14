import { expect, test } from '@playwright/test';
import { LoginPage } from '../../../playwright/pages/login.page';

const E2E_EMAIL = process.env.E2E_ADMIN_EMAIL ?? '';
const E2E_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';

/* Login page tests require being logged-out — clear any stored auth session. */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login Page', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test.describe('Form rendering', () => {
    test('renders login form with all expected fields', async () => {
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.submitButton).toBeVisible();
    });
  });

  test.describe('Client-side validation', () => {
    // The schema in login-page.tsx is required-only — `z.string().min(1)` on both fields, no
    // email format and no password length. That is deliberate: custom-auth users sign in with
    // a USERNAME, so a client-side email rule would lock them out, and the server is the only
    // thing that can judge a password. These tests used to assert "valid email" / "at least 8
    // characters" — copy the page has never produced — so they could only ever fail.
    test('shows a required error per empty field on submit', async ({ page }) => {
      await loginPage.submit();

      await expect(page.getByText(/this field is required/i)).toHaveCount(2);
    });

    test('does not block a username-shaped email client-side', async ({ page }) => {
      // Asserted by whether the sign-in request is actually attempted, rather than by the
      // absence of a message: absence passes just as happily when the form never submitted.
      let tokenRequested = false;
      await page.route('**/auth/v1/token**', (route) => {
        tokenRequested = true;
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'invalid_grant', error_description: 'stubbed' }),
        });
      });

      await loginPage.fillAndSubmit('not-an-email', 'validpass123');

      await expect.poll(() => tokenRequested).toBeTruthy();
    });

    test('does not enforce a password length client-side', async ({ page }) => {
      let tokenRequested = false;
      await page.route('**/auth/v1/token**', (route) => {
        tokenRequested = true;
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'invalid_grant', error_description: 'stubbed' }),
        });
      });

      await loginPage.fillAndSubmit('user@example.com', 'short');

      await expect.poll(() => tokenRequested).toBeTruthy();
    });
  });

  test.describe('Full auth flow', () => {
    test('logs in with valid credentials and redirects to clubs page', async ({ page }) => {
      await loginPage.fillAndSubmit(E2E_EMAIL, E2E_PASSWORD);

      // Should redirect to /clubs after successful GoTrue auth
      await expect(page).toHaveURL(/.*clubs/, { timeout: 15000 });
      await expect(page.getByRole('heading', { name: 'Clubs', level: 2 })).toBeVisible({
        timeout: 10000,
      });
    });

    test('shows error toast for invalid credentials', async ({ page }) => {
      await loginPage.fillAndSubmit(E2E_EMAIL, 'WrongPassword123!');

      // GoTrue returns an auth error → shown as a toast
      await expect(page.getByText(/invalid|incorrect|credentials/i)).toBeVisible({
        timeout: 10000,
      });
    });
  });
});
