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

const ROLES_RESPONSE = pagedResponse(
  [
    {
      id: 'rrrr-0001',
      name: 'ClubAdmin',
      description: null,
      isActive: true,
      isDefault: false,
      isElevated: true,
      isPortalRole: true,
      isSystem: false,
      clubId: null,
      permissions: [],
    },
    {
      id: 'rrrr-0002',
      name: 'Coach',
      description: null,
      isActive: true,
      isDefault: true,
      isElevated: false,
      isPortalRole: false,
      isSystem: false,
      clubId: CLUB.id,
      permissions: [],
    },
  ],
  2,
);

const EMPTY_USERS = pagedResponse([], 0);

const CREATED_USER = {
  id: 'uuuu-0001',
  clubId: CLUB.id,
  teamIds: ['dddd-0001'],
  email: 'newuser@example.com',
  phoneNumber: null,
  authMethod: 'Credentials',
  displayName: 'John Doe',
  isActive: true,
  createdAt: '2026-04-28T10:00:00Z',
  lastLoginAt: null,
  roles: ['Coach'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockStandardRoutes(page: import('@playwright/test').Page) {
  return Promise.all([
    page.route('**/api/clubs**', (route) => fulfillJson(route, CLUBS_RESPONSE)),
    page.route('**/api/teams**', (route) => fulfillJson(route, TEAMS_RESPONSE)),
    page.route('**/api/roles**', (route) => fulfillJson(route, ROLES_RESPONSE)),
    page.route('**/api/users**', (route) => {
      if (route.request().method() === 'GET') {
        return fulfillJson(route, EMPTY_USERS);
      }
      // POST — create user success
      return fulfillJson(route, CREATED_USER, 201);
    }),
  ]);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Users — Add User Drawer', () => {
  let usersPage: UsersPage;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    usersPage = new UsersPage(page);
  });

  // ─── Rendering ────────────────────────────────────────────────────────────

  test.describe('Drawer rendering', () => {
    test('Add button is disabled when no club is selected', async ({ page }) => {
      await page.route('**/api/clubs**', (route) => fulfillJson(route, CLUBS_RESPONSE));
      await page.route('**/api/users**', (route) => fulfillJson(route, EMPTY_USERS));
      await usersPage.goto();
      await usersPage.waitForLoad();

      await expect(usersPage.addButton).toBeDisabled();
    });

    test('Add button opens the drawer after selecting a club', async ({ page }) => {
      await mockStandardRoutes(page);
      await usersPage.goto();
      await usersPage.waitForLoad();

      await usersPage.selectClub('E2E Test Co');
      await expect(usersPage.addButton).toBeEnabled();

      await usersPage.openAddDrawer();
      await expect(usersPage.dialogPanel).toBeVisible();
    });

    test('team dropdown loads selected club teams with explicit paging', async ({ page }) => {
      await mockStandardRoutes(page);
      await usersPage.goto();
      await usersPage.waitForLoad();
      await usersPage.selectClub('E2E Test Co');
      await usersPage.openAddDrawer();

      // Default role (Coach) shows the Team Assignment multi-select, not the legacy single
      // Team field — the identity split: the single field is hidden for Athlete/Coach, superseded by
      // the many-to-many Team Assignment field.
      const [teamRequest] = await Promise.all([
        page.waitForRequest(
          (request) =>
            request.url().includes('/api/teams') && request.url().includes(`ClubId=${CLUB.id}`),
        ),
        usersPage.teamAssignmentSelect.click(),
      ]);

      const url = new URL(teamRequest.url());
      expect(url.searchParams.get('ClubId')).toBe(CLUB.id);
      expect(url.searchParams.get('Page')).toBe('1');
      // DX's TagBox/SelectBox CustomStore passes its own default `take` (20) to
      // use-team-select-store.ts — uiConfig.selectSearch.pageSize (50) is only the
      // fallback used when the widget passes no `take` at all.
      expect(url.searchParams.get('PageSize')).toBe('20');
      await expect(usersPage.dropdownOptions).toContainText('Engineering');
    });

    test('auth method dropdown is hidden in create mode, but phone is collected', async ({
      page,
    }) => {
      // New users are email/Credentials only in this phase, regardless of the club's
      // configured authentication method — the sign-in method selector is gone entirely
      // (user-sign-in-section.tsx: an admin can no longer switch a user between methods).
      //
      // Phone IS collected though, and this test used to assert it was hidden. the identity split made
      // Phone Number a contact field on every user — mandatory for Coach/Parent/Director/
      // ClubAdmin (PHONE_REQUIRED_ROLES) and optional for Athlete — so the field always
      // renders and only its required/optional marker changes with the role.
      const ssoClub = { ...CLUB, authenticationMethod: 'Google' };
      await page.route('**/api/clubs**', (route) =>
        fulfillJson(route, pagedResponse([ssoClub], 1)),
      );
      await page.route('**/api/teams**', (route) => fulfillJson(route, TEAMS_RESPONSE));
      await page.route('**/api/roles**', (route) => fulfillJson(route, ROLES_RESPONSE));
      await page.route('**/api/users**', (route) => fulfillJson(route, EMPTY_USERS));
      await usersPage.goto();
      await usersPage.waitForLoad();
      await usersPage.selectClub('E2E Test Co');
      await usersPage.openAddDrawer();

      await expect(usersPage.authMethodSelect).not.toBeVisible();
      await expect(usersPage.emailInput).toBeVisible();
      await expect(usersPage.phoneInput).toBeVisible();
    });
  });

  // ─── Validation ───────────────────────────────────────────────────────────

  test.describe('Form validation', () => {
    test('keeps the submit disabled while required fields are empty', async ({ page }) => {
      await mockStandardRoutes(page);
      await usersPage.goto();
      await usersPage.waitForLoad();
      await usersPage.selectClub('E2E Test Co');
      await usersPage.openAddDrawer();

      // user-drawer.tsx gates the action on `!isValid`, so an empty form cannot be
      // submitted at all — clicking waited the full 60s for a button that is disabled by
      // design. The disabled state IS the required-field feedback here; per-field messages
      // appear once a field has been touched, which the tests below cover.
      await expect(usersPage.submitButton).toBeDisabled();
    });

    test('shows invalid-chars error for names with numbers', async ({ page }) => {
      await mockStandardRoutes(page);
      await usersPage.goto();
      await usersPage.waitForLoad();
      await usersPage.selectClub('E2E Test Co');
      await usersPage.openAddDrawer();

      await usersPage.fillFirstName('John123');
      // Blur into the next field so the touched-field validation runs; submit stays disabled
      // while the form is invalid, so it cannot be used to trigger validation.
      await usersPage.fillLastName('Doe456');

      await expect(
        usersPage.fieldError('Name may only contain letters, spaces, hyphens, and apostrophes'),
      ).toBeVisible();
    });

    test('shows invalid email error for malformed email', async ({ page }) => {
      await mockStandardRoutes(page);
      await usersPage.goto();
      await usersPage.waitForLoad();
      await usersPage.selectClub('E2E Test Co');
      await usersPage.openAddDrawer();

      await usersPage.fillEmail('not-an-email');
      // See the note above — the disabled submit cannot be used to force validation.
      await usersPage.fillFirstName('John');

      await expect(usersPage.fieldError('Please enter a valid email address')).toBeVisible();
    });
  });

  // ─── Happy path (mocked) ──────────────────────────────────────────────────

  test.describe('Create user — happy path', () => {
    test('successfully creates a user and shows success toast', async ({ page }) => {
      await mockStandardRoutes(page);
      await usersPage.goto();
      await usersPage.waitForLoad();
      await usersPage.selectClub('E2E Test Co');
      await usersPage.openAddDrawer();

      await usersPage.fillFirstName('John');
      await usersPage.fillLastName('Doe');
      await usersPage.fillEmail('newuser@example.com');
      await usersPage.selectRole('Coach');
      await usersPage.fillPhone('0821234567');
      await usersPage.selectTeamAssignment('Engineering');

      // Submit opens a 'Create user?' confirmation; the POST only fires once it is accepted.
      await usersPage.submitForm();
      const [createResponse] = await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().includes('/api/users') &&
            resp.request().method() === 'POST' &&
            resp.status() === 201,
        ),
        usersPage.confirmCreate(),
      ]);

      expect(createResponse.ok()).toBe(true);
      await expect(usersPage.toastMessage).toContainText('User created successfully');
      await expect(usersPage.dialogPanel).not.toBeVisible();
    });

    test('creates a ClubAdmin user without selecting a team', async ({ page }) => {
      await mockStandardRoutes(page);
      await usersPage.goto();
      await usersPage.waitForLoad();
      await usersPage.selectClub('E2E Test Co');
      await usersPage.openAddDrawer();

      await usersPage.fillFirstName('Alex');
      await usersPage.fillLastName('Admin');
      await usersPage.fillEmail('alex.admin@example.com');
      // Displayed label, not the raw role name — user-role-section.tsx renders
      // "ClubAdmin" as "Club Admin" (space inserted before every capital).
      await usersPage.selectRole('Club Admin');
      await usersPage.fillPhone('0821234567');

      // Submit opens the 'Create user?' confirmation; the POST only fires once accepted.
      await usersPage.submitForm();
      const [createRequest] = await Promise.all([
        page.waitForRequest((req) => req.url().includes('/api/users') && req.method() === 'POST'),
        usersPage.confirmCreate(),
      ]);

      const body = createRequest.postDataJSON() as { teamIds?: string[] | null };
      expect(body.teamIds ?? null).toBeNull();
      await expect(usersPage.toastMessage).toContainText('User created successfully');
    });
  });

  // ─── Conflict handling (mocked) ───────────────────────────────────────────

  test.describe('Create user — conflict scenarios', () => {
    test('shows email conflict toast on 409 with email-conflict code', async ({ page }) => {
      await page.route('**/api/clubs**', (route) => fulfillJson(route, CLUBS_RESPONSE));
      await page.route('**/api/teams**', (route) => fulfillJson(route, TEAMS_RESPONSE));
      await page.route('**/api/roles**', (route) => fulfillJson(route, ROLES_RESPONSE));
      await page.route('**/api/users**', (route) => {
        if (route.request().method() === 'GET') {
          return fulfillJson(route, EMPTY_USERS);
        }
        return fulfillJson(
          route,
          {
            status: 409,
            title: 'Conflict',
            detail: 'A user with this email already exists.',
            errorCode: 'email-conflict',
          },
          409,
        );
      });

      await usersPage.goto();
      await usersPage.waitForLoad();
      await usersPage.selectClub('E2E Test Co');
      await usersPage.openAddDrawer();

      await usersPage.fillFirstName('Jane');
      await usersPage.fillLastName('Smith');
      await usersPage.fillEmail('existing@example.com');
      await usersPage.selectRole('Coach');
      await usersPage.fillPhone('0821234567');
      await usersPage.selectTeamAssignment('Engineering');
      await usersPage.submitForm();
      await usersPage.confirmCreate();

      await expect(usersPage.toastMessage).toContainText(
        'A user with this email already exists in this club',
      );
    });

    test('shows user-limit toast on 409 with max-users-reached code', async ({ page }) => {
      await page.route('**/api/clubs**', (route) => fulfillJson(route, CLUBS_RESPONSE));
      await page.route('**/api/teams**', (route) => fulfillJson(route, TEAMS_RESPONSE));
      await page.route('**/api/roles**', (route) => fulfillJson(route, ROLES_RESPONSE));
      await page.route('**/api/users**', (route) => {
        if (route.request().method() === 'GET') {
          return fulfillJson(route, EMPTY_USERS);
        }
        return fulfillJson(
          route,
          {
            status: 409,
            title: 'Conflict',
            detail: 'Club has reached its maximum user limit.',
            errorCode: 'max-users-reached',
          },
          409,
        );
      });

      await usersPage.goto();
      await usersPage.waitForLoad();
      await usersPage.selectClub('E2E Test Co');
      await usersPage.openAddDrawer();

      await usersPage.fillFirstName('New');
      await usersPage.fillLastName('User');
      await usersPage.fillEmail('new@example.com');
      await usersPage.selectRole('Coach');
      await usersPage.fillPhone('0821234567');
      await usersPage.selectTeamAssignment('Engineering');
      await usersPage.submitForm();
      await usersPage.confirmCreate();

      await expect(usersPage.toastMessage).toContainText(
        'This club has reached its maximum number of users',
      );
    });

    test('shows confirm dialog for user-exists-other-club and links on Yes', async ({ page }) => {
      let postCount = 0;
      await page.route('**/api/clubs**', (route) => fulfillJson(route, CLUBS_RESPONSE));
      await page.route('**/api/teams**', (route) => fulfillJson(route, TEAMS_RESPONSE));
      await page.route('**/api/roles**', (route) => fulfillJson(route, ROLES_RESPONSE));
      await page.route('**/api/users**', (route) => {
        if (route.request().method() === 'GET') {
          return fulfillJson(route, EMPTY_USERS);
        }
        // First POST → conflict with other-club; second (link) → success
        postCount++;
        if (postCount === 1) {
          return fulfillJson(
            route,
            {
              status: 409,
              title: 'Conflict',
              detail: 'A user with this email already exists in another club.',
              errorCode: 'user-exists-other-club',
              conflictingEntityId: 'uuuu-existing',
            },
            409,
          );
        }
        return fulfillJson(route, CREATED_USER, 200);
      });
      // Link endpoint
      await page.route('**/api/users/*/link-club**', (route) =>
        fulfillJson(route, CREATED_USER, 200),
      );

      await usersPage.goto();
      await usersPage.waitForLoad();
      await usersPage.selectClub('E2E Test Co');
      await usersPage.openAddDrawer();

      await usersPage.fillFirstName('Linked');
      await usersPage.fillLastName('User');
      await usersPage.fillEmail('cross-org@example.com');
      await usersPage.selectRole('Coach');
      await usersPage.fillPhone('0821234567');
      await usersPage.selectTeamAssignment('Engineering');
      await usersPage.submitForm();
      // Accepts the "Create user?" confirmation, which fires the POST that 409s.
      await usersPage.confirmCreate();

      // The 409 (user-exists-other-club) reopens the same shared ConfirmDialog with a
      // link-account prompt instead.
      await expect(usersPage.confirmDialog).toBeVisible();

      const linkResponse = page.waitForResponse(
        (r) => r.url().includes('/link-club') && r.request().method() === 'POST',
      );
      await usersPage.confirmLink();
      await linkResponse;

      await expect(usersPage.toastMessage).toContainText('User linked to club successfully');
      await expect(usersPage.dialogPanel).not.toBeVisible();
    });
  });
});
