import { expect, test } from '@playwright/test';
import { RolesPage } from '../../../playwright/pages/roles.page';
import { loginAsAdmin } from '../../../playwright/utils/auth';
import { fulfillJson } from '../../../playwright/utils/mock-routes';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ROLES_RESPONSE = {
  items: [
    {
      id: 'rrrr-0001',
      name: 'ClubAdmin',
      description: 'Full club access',
      isActive: true,
      isElevated: true,
      isPortalRole: true,
      isSystem: false,
      permissions: ['StarterKit.Users.View', 'StarterKit.Users.Manage'],
    },
    {
      id: 'rrrr-0002',
      name: 'Coach',
      description: null,
      isActive: true,
      isElevated: false,
      isPortalRole: false,
      isSystem: false,
      permissions: [],
    },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockRolesRoute(page: import('@playwright/test').Page) {
  return page.route('**/api/roles**', (route) => {
    if (route.request().method() === 'GET') {
      return fulfillJson(route, ROLES_RESPONSE);
    }
    return route.fallback();
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Roles page', () => {
  let rolesPage: RolesPage;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    rolesPage = new RolesPage(page);
  });

  test('renders the roles page container', async ({ page }) => {
    await mockRolesRoute(page);
    await rolesPage.goto();

    await expect(rolesPage.pageContainer).toBeVisible();
  });

  test('displays roles from the API', async ({ page }) => {
    await mockRolesRoute(page);
    await rolesPage.goto();

    await expect(rolesPage.pageContainer).toContainText('ClubAdmin');
    await expect(rolesPage.pageContainer).toContainText('Coach');
  });
});
