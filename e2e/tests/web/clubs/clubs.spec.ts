import { expect, test } from '@playwright/test';
import { ClubsPage } from '../../../playwright/pages/clubs.page';
import { loginAsAdmin } from '../../../playwright/utils/auth';
import { fulfillJson, pagedResponse } from '../../../playwright/utils/mock-routes';

// Stable fixture for mocked-API rendering tests (no real backend needed).
const MOCKED_LIST = pagedResponse(
  [
    {
      id: 'aaaa-0001',
      name: 'Acme Corp',
      subdomain: 'acme-corp',
      createdAt: '2025-01-01T00:00:00Z',
      teamCount: 2,
      activeUserCount: 5,
    },
    {
      id: 'aaaa-0002',
      name: 'Beta Ltd',
      subdomain: 'beta-ltd',
      createdAt: '2025-01-02T00:00:00Z',
      teamCount: 0,
      activeUserCount: 0,
    },
  ],
  2,
);

test.describe('Clubs Page', () => {
  let clubsPage: ClubsPage;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    clubsPage = new ClubsPage(page);
  });

  // ─── Page rendering (mocked API) ─────────────────────────────────────────────

  test.describe('Page rendering', () => {
    test('renders the page container and heading', async ({ page }) => {
      await page.route('**/api/clubs**', (route) => fulfillJson(route, pagedResponse([], 0)));
      await clubsPage.goto();
      await clubsPage.waitForLoad();

      await expect(clubsPage.pageContainer).toBeVisible();
      await expect(page.getByRole('heading', { name: /clubs/i })).toBeVisible();
      await expect(clubsPage.addButton).toBeVisible();
    });

    test('renders a row for each club', async ({ page }) => {
      await page.route('**/api/clubs**', (route) => fulfillJson(route, MOCKED_LIST));
      await clubsPage.goto();
      await clubsPage.waitForLoad();

      await expect(clubsPage.rowByName('Acme Corp')).toBeVisible();
      await expect(clubsPage.rowByName('Beta Ltd')).toBeVisible();
    });

    test('rows show the active-user count badge', async ({ page }) => {
      await page.route('**/api/clubs**', (route) => fulfillJson(route, MOCKED_LIST));
      await clubsPage.goto();
      await clubsPage.waitForLoad();

      // renderParentEnd renders a "<n> users" StatusBadge when activeUserCount > 0.
      await expect(clubsPage.rowByName('Acme Corp')).toContainText(/5 users/i);
    });
  });

  // ─── Add drawer (mocked) ─────────────────────────────────────────────────────

  test.describe('Add club drawer', () => {
    test('clicking Add opens the add drawer with the name + address fields', async ({ page }) => {
      await page.route('**/api/clubs**', (route) => fulfillJson(route, pagedResponse([], 0)));
      await clubsPage.goto();
      await clubsPage.waitForLoad();

      await clubsPage.addButton.click();
      await expect(clubsPage.addDrawer).toBeVisible();
      await expect(clubsPage.addDrawer.locator('#club-name')).toBeVisible();
      // The old single 'region' field was replaced by a US address (club-schema.ts requires
      // street, city and a 2-letter state).
      await expect(clubsPage.addDrawer.locator('#club-street-address')).toBeVisible();
      await expect(clubsPage.addDrawer.locator('#club-city')).toBeVisible();
      await expect(clubsPage.addDrawer.locator('#club-state')).toBeVisible();
    });
  });

  // ─── Edit drawer (mocked) ────────────────────────────────────────────────────

  test.describe('Edit club drawer', () => {
    test('the row menu → Edit opens the drawer pre-filled', async ({ page }) => {
      await page.route('**/api/clubs**', (route) => fulfillJson(route, MOCKED_LIST));
      await clubsPage.goto();
      await clubsPage.waitForLoad();

      await clubsPage.clickEdit('Acme Corp');

      await expect(clubsPage.editDrawer).toBeVisible();
      await expect(clubsPage.editDrawer.locator('#club-name')).toHaveValue('Acme Corp');
      // No subdomain assertion: `subdomain` no longer appears anywhere in apps/web/src —
      // tenancy stopped being subdomain-based, so there is no locked field to check.
    });
  });

  // ─── CRUD — real backend ─────────────────────────────────────────────────────
  //
  // Serial (create → edit → delete), each step asserts the HTTP status AND the
  // resulting grid state. Runs against the isolated webapi-e2e (:5003). A unique
  // name per run keeps invocations independent.

  test.describe
    .serial('CRUD — real backend', () => {
      const stamp = Date.now();
      const uniqueName = `E2E-Cmp-${stamp}`;
      const updatedName = `E2E-Upd-${stamp}`;

      test('creates a club (drawer → confirm → POST 201)', async ({ page }) => {
        await clubsPage.goto();
        await clubsPage.waitForLoad();

        await clubsPage.addButton.click();
        await expect(clubsPage.addDrawer).toBeVisible();
        // Submit the drawer form → opens the create ConfirmDialog.
        await clubsPage.fillAddAndSubmit(
          uniqueName,
          { street: '1 Test Street', city: 'Denver', state: 'CO' },
          // First season is mandatory at creation — dd/MM/yyyy per the admin picker.
          { start: '15/01/2026', end: '15/06/2026' },
        );

        const [createResponse] = await Promise.all([
          page.waitForResponse(
            (resp) =>
              resp.url().includes('/api/clubs') &&
              resp.request().method() === 'POST' &&
              resp.status() === 201,
          ),
          clubsPage.confirmDialogAction(),
        ]);
        expect(createResponse.ok()).toBe(true);

        await expect(clubsPage.rowByName(uniqueName)).toBeVisible({ timeout: 10_000 });
      });

      test('edits the club name (edit drawer → PUT 200)', async ({ page }) => {
        await clubsPage.goto();
        await clubsPage.waitForLoad();

        await clubsPage.clickEdit(uniqueName);
        await expect(clubsPage.editDrawer).toBeVisible();
        await expect(clubsPage.editDrawer.locator('#club-name')).toHaveValue(uniqueName, {
          timeout: 5_000,
        });

        const [updateResponse] = await Promise.all([
          page.waitForResponse(
            (resp) =>
              resp.url().includes('/api/clubs') &&
              resp.request().method() === 'PUT' &&
              resp.status() === 200,
          ),
          clubsPage.fillEditAndSubmit(updatedName),
        ]);
        expect(updateResponse.ok()).toBe(true);

        await expect(clubsPage.rowByName(updatedName)).toBeVisible({ timeout: 10_000 });
        await expect(clubsPage.rowByName(uniqueName)).toHaveCount(0);
      });

      test('deletes the club (row menu → confirm → DELETE 204)', async ({ page }) => {
        await clubsPage.goto();
        await clubsPage.waitForLoad();

        await clubsPage.clickDelete(updatedName);

        const [deleteResponse] = await Promise.all([
          page.waitForResponse(
            (resp) =>
              resp.url().includes('/api/clubs') &&
              resp.request().method() === 'DELETE' &&
              resp.status() === 204,
          ),
          clubsPage.confirmDialogAction(),
        ]);
        expect(deleteResponse.ok()).toBe(true);

        await expect(clubsPage.rowByName(updatedName)).toHaveCount(0, { timeout: 10_000 });
      });
    });
});
