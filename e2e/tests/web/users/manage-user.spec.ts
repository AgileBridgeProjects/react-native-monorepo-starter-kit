import { expect, test } from '@playwright/test';
import { UsersPage } from '../../../playwright/pages/users.page';
import { loginAsAdmin } from '../../../playwright/utils/auth';
import { fulfillJson, pagedResponse } from '../../../playwright/utils/mock-routes';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CLUB = {
  id: 'cccc-0001',
  name: 'E2E Test Co',
  authenticationMethod: 'Credentials',
  maxUsers: 100,
};

const CLUBS_RESPONSE = pagedResponse([CLUB], 1);

const TEAMS_RESPONSE = pagedResponse(
  [{ id: 'dddd-0001', name: 'Engineering', clubId: CLUB.id }],
  1,
);

const ROLES_RESPONSE = [
  { id: 'rrrr-0001', name: 'ClubAdmin' },
  { id: 'rrrr-0002', name: 'Coach' },
];

const EXISTING_USER = {
  id: 'uuuu-0001',
  clubId: CLUB.id,
  teamIds: ['dddd-0001'],
  email: 'existing@example.com',
  phoneNumber: '+27821234567',
  authMethod: 'Credentials',
  displayName: 'Existing User',
  isActive: true,
  createdAt: '2026-04-01T10:00:00Z',
  lastLoginAt: '2026-04-20T08:00:00Z',
  roles: ['Coach'],
};

const USERS_RESPONSE = pagedResponse([EXISTING_USER], 1);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockStandardRoutes(page: import('@playwright/test').Page) {
  return Promise.all([
    page.route('**/api/clubs**', (route) => fulfillJson(route, CLUBS_RESPONSE)),
    page.route('**/api/teams**', (route) => fulfillJson(route, TEAMS_RESPONSE)),
    page.route('**/api/roles**', (route) => fulfillJson(route, ROLES_RESPONSE)),
    page.route('**/api/users**', (route) => {
      if (route.request().method() === 'GET') {
        return fulfillJson(route, USERS_RESPONSE);
      }
      return route.fallback();
    }),
  ]);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Users — Edit, Delete, Suspend, Bulk Disable', () => {
  let usersPage: UsersPage;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    usersPage = new UsersPage(page);
  });

  // ─── Edit ───────────────────────────────────────────────────────────────

  test.describe('Edit user', () => {
    test('opens drawer with user data when clicking edit button', async ({ page }) => {
      await mockStandardRoutes(page);
      await usersPage.goto();
      await usersPage.waitForLoad();
      await usersPage.selectClub('E2E Test Co');

      await usersPage.clickEditButton();

      await expect(usersPage.drawer).toBeVisible();
      await expect(usersPage.firstNameInput).toHaveValue('Existing');
      await expect(usersPage.lastNameInput).toHaveValue('User');
    });

    test('successfully updates a user', async ({ page }) => {
      await mockStandardRoutes(page);
      await page.route('**/api/users/*', (route) => {
        if (route.request().method() === 'PUT') {
          return fulfillJson(route, { ...EXISTING_USER, displayName: 'Updated Name' });
        }
        if (route.request().method() === 'GET') {
          return fulfillJson(route, EXISTING_USER);
        }
        return route.fallback();
      });

      await usersPage.goto();
      await usersPage.waitForLoad();
      await usersPage.selectClub('E2E Test Co');
      await usersPage.clickEditButton();

      await usersPage.fillFirstName('Updated');
      await usersPage.fillLastName('Name');

      await usersPage.submitForm();
      const [updateResponse] = await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().includes('/api/users/') &&
            resp.request().method() === 'PUT' &&
            resp.status() === 200,
        ),
        usersPage.acceptConfirmDialog(),
      ]);

      expect(updateResponse.ok()).toBeTruthy();
      await expect(usersPage.toastMessage).toContainText('User updated successfully');
    });
  });

  // ─── Delete ─────────────────────────────────────────────────────────────

  test.describe('Delete user', () => {
    test('shows confirmation dialog and deletes user on confirm', async ({ page }) => {
      await mockStandardRoutes(page);
      await page.route('**/api/users/*', (route) => {
        if (route.request().method() === 'DELETE') {
          return route.fulfill({ status: 204 });
        }
        return route.fallback();
      });

      await usersPage.goto();
      await usersPage.waitForLoad();
      await usersPage.selectClub('E2E Test Co');
      await usersPage.clickEditButton();

      await usersPage.clickDeleteButton();
      await usersPage.acceptConfirmDialog();

      await expect(usersPage.toastMessage).toContainText(/deleted/i);
      await expect(usersPage.dialogPanel).not.toBeVisible();
    });
  });

  // ─── Suspend / Activate ─────────────────────────────────────────────────

  test.describe('Suspend user', () => {
    test('suspends an active user after confirmation', async ({ page }) => {
      await mockStandardRoutes(page);
      await page.route('**/api/users/*/status', (route) => {
        if (route.request().method() === 'PATCH') {
          return fulfillJson(route, { ...EXISTING_USER, isActive: false });
        }
        return route.fallback();
      });

      await usersPage.goto();
      await usersPage.waitForLoad();
      await usersPage.selectClub('E2E Test Co');
      await usersPage.clickEditButton();

      await usersPage.clickToggleActiveButton();
      await usersPage.acceptConfirmDialog();

      await expect(usersPage.toastMessage).toContainText(/suspended/i);
    });

    test('activates a suspended user after confirmation', async ({ page }) => {
      const suspendedUser = { ...EXISTING_USER, isActive: false };
      await page.route('**/api/clubs**', (route) => fulfillJson(route, CLUBS_RESPONSE));
      await page.route('**/api/teams**', (route) => fulfillJson(route, TEAMS_RESPONSE));
      await page.route('**/api/roles**', (route) => fulfillJson(route, ROLES_RESPONSE));
      await page.route('**/api/users**', (route) => {
        if (route.request().method() === 'GET') {
          return fulfillJson(route, pagedResponse([suspendedUser], 1));
        }
        return route.fallback();
      });
      await page.route('**/api/users/*/status', (route) => {
        if (route.request().method() === 'PATCH') {
          return fulfillJson(route, { ...suspendedUser, isActive: true });
        }
        return route.fallback();
      });

      await usersPage.goto();
      await usersPage.waitForLoad();
      await usersPage.selectClub('E2E Test Co');
      await usersPage.clickEditButton();

      await usersPage.clickToggleActiveButton();
      await usersPage.acceptConfirmDialog();

      await expect(usersPage.toastMessage).toContainText(/activated/i);
    });
  });

  // ─── Bulk Disable ──────────────────────────────────────────────────────

  test.describe('Bulk disable', () => {
    test('the bulk action button is not shown when no rows are selected', async ({ page }) => {
      await mockStandardRoutes(page);
      await usersPage.goto();
      await usersPage.waitForLoad();
      await usersPage.selectClub('E2E Test Co');

      // user-grid-toolbar.tsx only renders the selection bar (and its bulk action button)
      // once selectedCount > 0 — there is no standing button to disable with zero rows.
      await expect(usersPage.bulkDisableButton).toHaveCount(0);
    });

    test('bulk-disables selected users after confirmation', async ({ page }) => {
      await mockStandardRoutes(page);
      let patchCount = 0;
      await page.route('**/api/users/*/status', (route) => {
        if (route.request().method() === 'PATCH') {
          patchCount++;
          return fulfillJson(route, { ...EXISTING_USER, isActive: false });
        }
        return route.fallback();
      });

      await usersPage.goto();
      await usersPage.waitForLoad();
      await usersPage.selectClub('E2E Test Co');

      await usersPage.selectRowCheckbox(EXISTING_USER.displayName);

      await usersPage.clickBulkDisable();
      await usersPage.acceptConfirmDialog();

      expect(patchCount).toBeGreaterThanOrEqual(1);
    });
  });
});
