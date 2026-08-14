import { expect, test } from '@playwright/test';
import { EditProfilePage } from '../../../expo/pages/profile.page';
import { injectExpoSupabaseAuth } from '../../../playwright/utils/auth';
import { fulfillJson } from '../../../playwright/utils/mock-routes';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function profileResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    displayName: 'Alex Johnson',
    email: 'alex.johnson@starterkit.local',
    avatarUrl: null,
    clubName: 'StarterKit',
    gamesPlayed: 8,
    gamesPassed: 3,
    totalSessions: 12,
    totalAssignedGames: 10,
    joinedAt: '2026-04-24T00:00:00Z',
    authMethod: 'Credentials',
    ...overrides,
  };
}

const AVATAR_RESPONSE = {
  avatarBlobPath: 'avatars/11111111/avatar.jpg',
  avatarUrl: 'https://blob.local/avatars/11111111/avatar.jpg?sas=token',
};

/** A tiny valid PNG, sufficient to satisfy the web file input. */
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

// ─── Display name ───────────────────────────────────────────────────────────────

test.describe('Edit Profile — display name', () => {
  let editPage: EditProfilePage;

  test.beforeEach(async ({ page }) => {
    await injectExpoSupabaseAuth(page);
    editPage = new EditProfilePage(page);
  });

  test('save is disabled until the name actually changes', async ({ page }) => {
    await page.route('**/api/users/me/profile', (route) => fulfillJson(route, profileResponse()));

    await editPage.goto();
    await editPage.waitForScreen();

    // Seeded with the current name → no change yet → save disabled.
    await expect(editPage.saveButton).toBeDisabled();

    await editPage.fillDisplayName('Alex Smith');
    await expect(editPage.saveButton).toBeEnabled();

    // Reverting back to the original value disables it again.
    await editPage.fillDisplayName('Alex Johnson');
    await expect(editPage.saveButton).toBeDisabled();
  });

  test('saving a new display name PATCHes and navigates back', async ({ page }) => {
    await page.route('**/api/users/me/profile', (route) => {
      if (route.request().method() === 'PATCH') return fulfillJson(route, {});
      return fulfillJson(route, profileResponse());
    });

    await editPage.goto();
    await editPage.waitForScreen();

    await editPage.fillDisplayName('Alex Smith');
    const [patchResp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/users/me/profile') && r.request().method() === 'PATCH',
      ),
      editPage.save(),
    ]);
    expect(patchResp.ok()).toBe(true);

    // router.back() leaves the edit screen.
    await expect(editPage.screen).toHaveCount(0, { timeout: 10_000 });
  });

  test('a name under 2 characters fails validation and stays on screen', async ({ page }) => {
    let patchCalled = false;
    await page.route('**/api/users/me/profile', (route) => {
      if (route.request().method() === 'PATCH') {
        patchCalled = true;
        return fulfillJson(route, {});
      }
      return fulfillJson(route, profileResponse());
    });

    await editPage.goto();
    await editPage.waitForScreen();

    // Single char trims to length 1 → native Alert on RN, no-op nav on web.
    await editPage.fillDisplayName('A');
    await editPage.save();

    // Stays on the edit screen and never PATCHes.
    await expect(editPage.screen).toBeVisible();
    expect(patchCalled).toBe(false);
  });

  test('refetches on focus so an externally-changed name appears', async ({ page }) => {
    // Navigates away and back (each a full SPA reboot); allow extra headroom on the
    // slower web viewports under full-suite load.
    test.slow();
    let getCount = 0;
    await page.route('**/api/users/me/profile', (route) => {
      if (route.request().method() === 'PATCH') return fulfillJson(route, {});
      getCount += 1;
      // First GET = original; subsequent GETs (focus refetch) = updated.
      return fulfillJson(
        route,
        profileResponse({ displayName: getCount <= 1 ? 'Alex Johnson' : 'Alex Renamed' }),
      );
    });

    await editPage.goto();
    await editPage.waitForScreen();
    await expect(editPage.displayNameInput).toHaveValue('Alex Johnson');

    const getsAfterFirstLoad = getCount;
    expect(getsAfterFirstLoad).toBeGreaterThanOrEqual(1);

    // useFocusEffect refetches whenever the screen (re)gains navigation focus. On web
    // that fires on real navigation, not on a synthetic window focus event — so leave
    // the edit screen, then return.
    await page.goto('/settings');
    await page.getByTestId('settings-screen').waitFor({ state: 'visible' });
    await editPage.goto();
    await editPage.waitForScreen();

    // Poll the server-hit counter directly (no response-timing race): returning to the
    // screen must have re-queried the profile at least once more than the first load.
    await expect.poll(() => getCount, { timeout: 15_000 }).toBeGreaterThan(getsAfterFirstLoad);
  });
});

// ─── Avatar ───────────────────────────────────────────────────────────────────

test.describe('Edit Profile — avatar', () => {
  let editPage: EditProfilePage;

  test.beforeEach(async ({ page }) => {
    await injectExpoSupabaseAuth(page);
    editPage = new EditProfilePage(page);
  });

  test('picking a photo POSTs to /avatar then PATCHes the blob path', async ({ page }) => {
    await page.route('**/api/users/me/profile', (route) => {
      if (route.request().method() === 'PATCH') return fulfillJson(route, {});
      return fulfillJson(route, profileResponse());
    });
    // The avatar upload uses a raw XHR — page.route still intercepts it.
    await page.route('**/api/users/me/avatar', (route) => fulfillJson(route, AVATAR_RESPONSE));

    await editPage.goto();
    await editPage.waitForScreen();

    // Drive the hidden web <input type="file"> via the filechooser event.
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      editPage.avatarButton.click(),
    ]);
    await chooser.setFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG_1PX });

    const postResp = await page.waitForResponse(
      (r) => r.url().includes('/api/users/me/avatar') && r.request().method() === 'POST',
    );
    expect(postResp.ok()).toBe(true);

    // After a successful upload the blob path is persisted via PATCH.
    const patchResp = await page.waitForResponse(
      (r) => r.url().includes('/api/users/me/profile') && r.request().method() === 'PATCH',
    );
    expect(patchResp.ok()).toBe(true);
  });

  test('avatar upload error does not PATCH and keeps the screen', async ({ page }) => {
    let patchCalled = false;
    await page.route('**/api/users/me/profile', (route) => {
      if (route.request().method() === 'PATCH') {
        patchCalled = true;
        return fulfillJson(route, {});
      }
      return fulfillJson(route, profileResponse());
    });
    await page.route('**/api/users/me/avatar', (route) =>
      fulfillJson(route, { title: 'Upload failed' }, 500),
    );

    await editPage.goto();
    await editPage.waitForScreen();

    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      editPage.avatarButton.click(),
    ]);
    await chooser.setFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG_1PX });

    await page.waitForResponse(
      (r) =>
        r.url().includes('/api/users/me/avatar') &&
        r.request().method() === 'POST' &&
        r.status() === 500,
    );

    // The catch reverts the optimistic preview; no PATCH is issued.
    await expect(editPage.screen).toBeVisible();
    expect(patchCalled).toBe(false);
  });

  // NOTE: the 5 MB oversize boundary is enforced from `asset.fileSize` returned by
  // ImagePicker, which is not populated for a Playwright filechooser upload — so this
  // path is unreachable from web E2E. Prefer a unit test on `pickAndUploadAvatar`.
});

// ─── Change password — gated by authMethod ────────────────────────────────────

test.describe('Edit Profile — change-password gating', () => {
  let editPage: EditProfilePage;

  test.beforeEach(async ({ page }) => {
    await injectExpoSupabaseAuth(page);
    editPage = new EditProfilePage(page);
  });

  for (const method of ['Credentials', 'CustomAuthentication'] as const) {
    test(`shows the change-password section for ${method} accounts`, async ({ page }) => {
      await page.route('**/api/users/me/profile', (route) =>
        fulfillJson(route, profileResponse({ authMethod: method })),
      );

      await editPage.goto();
      await editPage.waitForScreen();

      await expect(editPage.changePasswordSubmit).toBeVisible();
    });
  }

  for (const method of ['Google', 'Microsoft365', 'PhoneOtp'] as const) {
    test(`hides the change-password section for ${method} accounts`, async ({ page }) => {
      await page.route('**/api/users/me/profile', (route) =>
        fulfillJson(route, profileResponse({ authMethod: method })),
      );

      await editPage.goto();
      await editPage.waitForScreen();

      await expect(editPage.changePasswordSubmit).toHaveCount(0);
    });
  }
});
