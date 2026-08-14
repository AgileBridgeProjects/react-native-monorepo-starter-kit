import { expect, test } from '@playwright/test';
import { HelpPage } from '../../../expo/pages/profile.page';
import { injectExpoSupabaseAuth } from '../../../playwright/utils/auth';
import { fulfillJson } from '../../../playwright/utils/mock-routes';

test.describe('Help Screen', () => {
  let helpPage: HelpPage;

  test.beforeEach(async ({ page }) => {
    await injectExpoSupabaseAuth(page);
    helpPage = new HelpPage(page);
  });

  test('renders the contact-support form', async () => {
    await helpPage.goto();
    await helpPage.waitForScreen();

    await expect(helpPage.subjectInput).toBeVisible();
    await expect(helpPage.bodyInput).toBeVisible();
    await expect(helpPage.sendButton).toBeVisible();
  });

  // ─── Validation — stays on the form, never POSTs ──────────────────────────

  test('subject under 3 characters fails validation', async ({ page }) => {
    let posted = false;
    await page.route('**/api/support/help', (route) => {
      posted = true;
      return fulfillJson(route, {});
    });

    await helpPage.goto();
    await helpPage.waitForScreen();

    await helpPage.fillForm('hi', 'This is a long enough message body.');
    await helpPage.send();

    await expect(helpPage.screen).toBeVisible();
    expect(posted).toBe(false);
  });

  test('body under 10 characters fails validation', async ({ page }) => {
    let posted = false;
    await page.route('**/api/support/help', (route) => {
      posted = true;
      return fulfillJson(route, {});
    });

    await helpPage.goto();
    await helpPage.waitForScreen();

    await helpPage.fillForm('Valid subject', 'too short');
    await helpPage.send();

    await expect(helpPage.screen).toBeVisible();
    expect(posted).toBe(false);
  });

  // ─── Success → successView + doneButton ───────────────────────────────────

  test('valid submission POSTs and shows the success view', async ({ page }) => {
    await page.route('**/api/support/help', (route) => fulfillJson(route, {}));

    await helpPage.goto();
    await helpPage.waitForScreen();

    await helpPage.fillForm('Cannot start a game', 'The start button never responds for me.');
    const [postResp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/support/help') && r.request().method() === 'POST',
      ),
      helpPage.send(),
    ]);
    expect(postResp.ok()).toBe(true);

    await expect(helpPage.successView).toBeVisible();
    await expect(helpPage.doneButton).toBeVisible();
  });

  // ─── Error → stays on the form ─────────────────────────────────────────────

  test('server error keeps the form visible (no success view)', async ({ page }) => {
    await page.route('**/api/support/help', (route) =>
      fulfillJson(route, { title: 'Server Error' }, 500),
    );

    await helpPage.goto();
    await helpPage.waitForScreen();

    await helpPage.fillForm('Cannot start a game', 'The start button never responds for me.');
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes('/api/support/help') &&
          r.request().method() === 'POST' &&
          r.status() === 500,
      ),
      helpPage.send(),
    ]);

    await expect(helpPage.successView).toHaveCount(0);
    await expect(helpPage.screen).toBeVisible();
  });
});
