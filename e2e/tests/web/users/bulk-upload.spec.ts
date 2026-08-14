import { expect, type Page, test } from '@playwright/test';
import { UsersPage } from '../../../playwright/pages/users.page';
import { USERS_TEST_IDS } from '../../../playwright/selectors';
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

const EMPTY_USERS = pagedResponse([], 0);

const PREVIEW_RESPONSE = {
  readyToAdd: [
    {
      rowNumber: 2,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phoneNumber: null,
      authMethod: 'Credentials',
      roleName: 'Coach',
      teamName: null,
      teamId: null,
      username: null,
    },
  ],
  validationErrors: [],
  duplicates: [],
  unprocessable: [],
  totalRows: 1,
};

const CONFIRM_RESPONSE = {
  createdCount: 1,
  failedCount: 0,
  failures: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function setupPage(page: Page) {
  await loginAsAdmin(page);

  await page.route('**/api/clubs**', (route) => fulfillJson(route, CLUBS_RESPONSE));
  await page.route('**/api/teams**', (route) => fulfillJson(route, pagedResponse([], 0)));
  await page.route('**/api/users**', (route) => fulfillJson(route, EMPTY_USERS));
  await page.route('**/api/roles**', (route) =>
    fulfillJson(route, { items: [{ id: 'r1', name: 'Coach', isDefault: true }] }),
  );

  await page.goto('/users');
  // users-view.tsx disables the bulk-upload button until a club is selected
  // (`disabled={!effectiveClubId}`) — without this, clicking it hangs forever.
  await new UsersPage(page).selectClub('E2E Test Co');
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Bulk upload users', () => {
  test('happy path — upload valid file, preview, confirm', async ({ page }) => {
    await setupPage(page);

    // Intercept the preview and confirm API calls. Trailing `**` matters here — the
    // datasource sends clubId/teamId as query params (postApiUsersBulkUploadPreview), and a
    // glob with no wildcard at the end only matches a URL with nothing after it.
    await page.route('**/api/users/bulk-upload/preview**', (route) =>
      fulfillJson(route, PREVIEW_RESPONSE),
    );
    await page.route('**/api/users/bulk-upload/confirm**', (route) =>
      fulfillJson(route, CONFIRM_RESPONSE),
    );

    // Open the bulk upload drawer
    await page.getByTestId('users-bulk-upload-button').click();

    // The drawer should be visible
    await expect(
      page.getByTestId(USERS_TEST_IDS.bulkUploadDrawer).getByRole('dialog'),
    ).toBeVisible();

    // Selecting a file triggers the preview immediately — there is no separate
    // "Preview" step/button (user-bulk-upload-dialog.tsx's handleFileChange calls
    // triggerPreview as soon as a file is picked).
    const fileInput = page.getByTestId('users-bulk-upload-file-input');
    await fileInput.setInputFiles({
      name: 'test-users.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('PK'), // minimal XLSX header — server is mocked
    });

    // Preview grid should show the ready-to-add row
    // .first() — "John" also matches inside "john.doe@example.com" in the email column.
    await expect(page.getByText('John').first()).toBeVisible();

    // Click Add
    await page.getByTestId(USERS_TEST_IDS.bulkUploadConfirmButton).click();

    // Success toast and drawer closed
    await expect(page.getByText(/user\(s\) created successfully/i)).toBeVisible();
    await expect(
      page.getByTestId(USERS_TEST_IDS.bulkUploadDrawer).getByRole('dialog'),
    ).not.toBeVisible();
  });

  test('server error on preview — shows error toast', async ({ page }) => {
    await setupPage(page);

    await page.route('**/api/users/bulk-upload/preview**', (route) =>
      route.fulfill({ status: 500, body: 'Internal Server Error' }),
    );

    await page.getByTestId('users-bulk-upload-button').click();

    await expect(
      page.getByTestId(USERS_TEST_IDS.bulkUploadDrawer).getByRole('dialog'),
    ).toBeVisible();

    const fileInput = page.getByTestId('users-bulk-upload-file-input');
    await fileInput.setInputFiles({
      name: 'bad.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('PK'),
    });

    await expect(page.getByText(/failed to parse the uploaded file/i)).toBeVisible();
  });

  test('server error on confirm — shows error toast', async ({ page }) => {
    await setupPage(page);

    await page.route('**/api/users/bulk-upload/preview**', (route) =>
      fulfillJson(route, PREVIEW_RESPONSE),
    );
    await page.route('**/api/users/bulk-upload/confirm**', (route) =>
      route.fulfill({ status: 500, body: 'Internal Server Error' }),
    );

    await page.getByTestId('users-bulk-upload-button').click();

    const fileInput = page.getByTestId('users-bulk-upload-file-input');
    await fileInput.setInputFiles({
      name: 'test-users.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('PK'),
    });

    // .first() — "John" also matches inside "john.doe@example.com" in the email column.
    await expect(page.getByText('John').first()).toBeVisible();

    await page.getByTestId(USERS_TEST_IDS.bulkUploadConfirmButton).click();

    await expect(page.getByText(/failed to create users/i)).toBeVisible();
  });
});
