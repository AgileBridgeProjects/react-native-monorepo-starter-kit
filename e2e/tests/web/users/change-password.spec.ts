import { expect, type Page, test } from '@playwright/test';
import { UsersPage } from '../../../playwright/pages/users.page';
import { E2E_EMAIL, loginAsAdmin } from '../../../playwright/utils/auth';
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

// A password-based user (Credentials) — the change-password action is only
// offered for CustomAuthentication / Credentials users.
const TARGET_USER = {
  id: 'uuuu-0001',
  clubId: CLUB.id,
  teamIds: ['dddd-0001'],
  email: 'employee@example.com',
  phoneNumber: '+27821234567',
  authMethod: 'Credentials',
  displayName: 'Pat Employee',
  isActive: true,
  createdAt: '2026-04-01T10:00:00Z',
  lastLoginAt: '2026-04-20T08:00:00Z',
  roles: ['Coach'],
};

// A row whose email matches the logged-in admin — used to exercise the self-change
// warning path (isSelf === true).
const SELF_USER = {
  ...TARGET_USER,
  id: 'uuuu-0002',
  email: E2E_EMAIL,
  displayName: 'The Admin',
};

const VALID_PASSWORD = 'Test1!';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockStandardRoutes(page: Page, users: unknown[] = [TARGET_USER]) {
  return Promise.all([
    page.route('**/api/clubs**', (route) => fulfillJson(route, CLUBS_RESPONSE)),
    page.route('**/api/teams**', (route) => fulfillJson(route, TEAMS_RESPONSE)),
    page.route('**/api/roles**', (route) => fulfillJson(route, ROLES_RESPONSE)),
    page.route('**/api/users**', (route) => {
      if (route.request().method() === 'GET') {
        return fulfillJson(route, pagedResponse(users, users.length));
      }
      return route.fallback();
    }),
  ]);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Users — Change Password', () => {
  let usersPage: UsersPage;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    usersPage = new UsersPage(page);
  });

  test('opens the change-password drawer from the row menu with the target user name', async ({
    page,
  }) => {
    await mockStandardRoutes(page);
    await usersPage.goto();
    await usersPage.waitForLoad();
    await usersPage.selectClub('E2E Test Co');
    await usersPage.waitForGridLoad();

    await usersPage.openChangePassword('Pat Employee');

    await expect(usersPage.changePasswordDialog).toBeVisible();
    await expect(usersPage.changePasswordText('Pat Employee')).toBeVisible();
  });

  test('shows a mismatch error when the passwords do not match', async ({ page }) => {
    await mockStandardRoutes(page);
    await usersPage.goto();
    await usersPage.waitForLoad();
    await usersPage.selectClub('E2E Test Co');
    await usersPage.waitForGridLoad();
    await usersPage.openChangePassword('Pat Employee');

    await usersPage.fillNewPassword(VALID_PASSWORD);
    await usersPage.fillConfirmPassword('Different1!');
    await usersPage.submitChangePassword();

    await expect(usersPage.changePasswordText('Passwords do not match.')).toBeVisible();
  });

  test('rejects a password that fails the complexity rules', async ({ page }) => {
    await mockStandardRoutes(page);
    await usersPage.goto();
    await usersPage.waitForLoad();
    await usersPage.selectClub('E2E Test Co');
    await usersPage.waitForGridLoad();
    await usersPage.openChangePassword('Pat Employee');

    // Same value in both fields (so confirm matches) but it fails complexity.
    await usersPage.fillNewPassword('weak');
    await usersPage.fillConfirmPassword('weak');
    await usersPage.submitChangePassword();

    await expect(
      usersPage.changePasswordText('Password does not meet the requirements above.'),
    ).toBeVisible();
  });

  test('changes the password and shows a success toast', async ({ page }) => {
    await mockStandardRoutes(page);
    await page.route('**/api/users/*/change-password', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({ status: 204 });
      }
      return route.fallback();
    });

    await usersPage.goto();
    await usersPage.waitForLoad();
    await usersPage.selectClub('E2E Test Co');
    await usersPage.waitForGridLoad();
    await usersPage.openChangePassword('Pat Employee');

    await usersPage.fillNewPassword(VALID_PASSWORD);
    await usersPage.fillConfirmPassword(VALID_PASSWORD);

    const [changeResponse] = await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes('/change-password') &&
          resp.request().method() === 'POST' &&
          resp.status() === 204,
      ),
      usersPage.submitChangePassword(),
    ]);

    // Correct endpoint (target user id) and payload reached the backend.
    expect(changeResponse.request().url()).toContain(
      `/api/users/${TARGET_USER.id}/change-password`,
    );
    expect(changeResponse.request().postDataJSON()).toMatchObject({ newPassword: VALID_PASSWORD });

    await expect(usersPage.toastMessage).toContainText('Password changed successfully.');
    await expect(usersPage.changePasswordDialog).not.toBeVisible();
  });

  test('warns and offers a log-out label when changing your own password', async ({ page }) => {
    await mockStandardRoutes(page, [SELF_USER]);
    await usersPage.goto();
    await usersPage.waitForLoad();
    await usersPage.selectClub('E2E Test Co');
    await usersPage.waitForGridLoad();

    await usersPage.openChangePassword('The Admin');

    // Self-change surfaces a warning banner and a "log out" submit label.
    await expect(usersPage.changePasswordText(/logged out/i)).toBeVisible();
    await expect(usersPage.changePasswordSubmit).toContainText(/log out/i);
  });
});
