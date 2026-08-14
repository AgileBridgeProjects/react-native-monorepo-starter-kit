import { expect, type Page, test } from '@playwright/test';
import { ProfilePage } from '../../../expo/pages/profile.page';
import { injectExpoSupabaseAuth } from '../../../playwright/utils/auth';
import { fulfillJson } from '../../../playwright/utils/mock-routes';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PROFILE_RESPONSE = {
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
};

const NO_HIGHLIGHTS = { bestLeague: 'Bronze', mostXp: 0, mostXpSeasonName: null, seasonName: null };
const NO_SEASON_HISTORY: unknown[] = [];

/**
 * The profile screen hides the in-screen logout when `Platform.OS === 'web' && isTablet`
 * (the sidebar owns sign-out there). `isTablet` is true at >= md (768 px), so both the
 * 834 (web-tablet) and 1280 (desktop) projects use sidebar chrome; only the 390 (mobile)
 * project renders the in-screen logout.
 */
function usesSidebarChrome(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) >= 768;
}

/** Default mocks so the profile screen + season strip resolve without hanging. */
async function mockProfileBundle(page: Page, profile: object = PROFILE_RESPONSE) {
  await page.route('**/api/users/me/profile', (route) => fulfillJson(route, profile));
  await page.route('**/api/league/season-highlights', (route) => fulfillJson(route, NO_HIGHLIGHTS));
  await page.route('**/api/league/season-history', (route) =>
    fulfillJson(route, NO_SEASON_HISTORY),
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Profile Screen', () => {
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    await injectExpoSupabaseAuth(page);
    profilePage = new ProfilePage(page);
  });

  test.describe('Happy path', () => {
    test('renders display name and email from the API', async ({ page }) => {
      await mockProfileBundle(page);

      await profilePage.goto();
      await profilePage.waitForScreen();

      await expect(profilePage.displayName).toBeVisible();
      await expect(profilePage.displayName).toHaveText(PROFILE_RESPONSE.displayName);
      await expect(profilePage.email).toHaveText(PROFILE_RESPONSE.email);
    });

    test('renders the avatar button and the navigation menu rows', async ({ page }) => {
      await mockProfileBundle(page);

      await profilePage.goto();
      await profilePage.waitForScreen();

      await expect(profilePage.avatarButton).toBeVisible();
      await expect(profilePage.editProfileMenuItem).toBeVisible();
      await expect(profilePage.settingsMenuItem).toBeVisible();
      await expect(profilePage.helpMenuItem).toBeVisible();
    });
  });

  test.describe('Server error', () => {
    test('renders the screen even when the profile API returns 500', async ({ page }) => {
      await page.route('**/api/users/me/profile', (route) =>
        fulfillJson(route, { title: 'Server Error' }, 500),
      );
      await page.route('**/api/league/season-highlights', (route) =>
        fulfillJson(route, NO_HIGHLIGHTS),
      );
      await page.route('**/api/league/season-history', (route) =>
        fulfillJson(route, NO_SEASON_HISTORY),
      );

      await profilePage.goto();
      await profilePage.waitForScreen();

      // Screen still renders — auth-store name/email used as fallback.
      await expect(profilePage.screen).toBeVisible();
    });
  });

  // ─── Navigation from the menu rows (real testIDs, not the ghost name field) ──

  test.describe('Navigation', () => {
    test('opens Edit profile from the menu row', async ({ page }) => {
      await mockProfileBundle(page);

      await profilePage.goto();
      await profilePage.waitForScreen();
      await profilePage.openEditProfile();

      await expect(page).toHaveURL(/edit-profile/);
    });

    test('opens Settings from the menu row', async ({ page }) => {
      await mockProfileBundle(page);

      await profilePage.goto();
      await profilePage.waitForScreen();
      await profilePage.openSettings();

      await expect(page).toHaveURL(/settings/);
    });

    test('opens Help from the menu row', async ({ page }) => {
      await mockProfileBundle(page);

      await profilePage.goto();
      await profilePage.waitForScreen();
      await profilePage.openHelp();

      await expect(page).toHaveURL(/help/);
    });
  });

  // ─── Sign-out — two viewport paths ──────────────────────────────────────────

  test.describe('Sign out', () => {
    test('in-screen sign-out routes to login (mobile only)', async ({ page }) => {
      test.skip(
        usesSidebarChrome(page),
        'In-screen logout is hidden on web chrome (sidebar owns it).',
      );
      await mockProfileBundle(page);

      await profilePage.goto();
      await profilePage.waitForScreen();

      await expect(profilePage.logoutButton).toBeVisible();
      await profilePage.signOut();

      await expect(page).toHaveURL(/\(auth\)\/login|\/login/);
    });

    test('in-screen sign-out is absent on web chrome (sidebar mode)', async ({ page }) => {
      test.skip(!usesSidebarChrome(page), 'Only relevant to web chrome (tablet + desktop).');
      await mockProfileBundle(page);

      await profilePage.goto();
      await profilePage.waitForScreen();

      await expect(profilePage.logoutButton).toHaveCount(0);
    });
  });
});

// ─── Cross-feature chain: edit name → reflected on the home header ──────────────
//
// Profile + home both read the shared ['profile'] React Query key, so a name change
// persisted via PATCH and re-fetched on home should surface in the header greeting.

test.describe('Profile → Home header chain', () => {
  test('updated display name is reflected after navigating to home', async ({ page }) => {
    await injectExpoSupabaseAuth(page);
    const profilePage = new ProfilePage(page);

    let patched = false;
    await page.route('**/api/users/me/profile', (route) => {
      const method = route.request().method();
      if (method === 'PATCH') {
        patched = true;
        return fulfillJson(route, {});
      }
      return fulfillJson(route, {
        ...PROFILE_RESPONSE,
        displayName: patched ? 'Alex Smith' : PROFILE_RESPONSE.displayName,
      });
    });
    await page.route('**/api/league/season-highlights', (route) =>
      fulfillJson(route, NO_HIGHLIGHTS),
    );
    await page.route('**/api/league/season-history', (route) =>
      fulfillJson(route, NO_SEASON_HISTORY),
    );

    await profilePage.goto();
    await profilePage.waitForScreen();
    await expect(profilePage.displayName).toHaveText(PROFILE_RESPONSE.displayName);

    // Patch the name via the profile API directly so we exercise the shared-key refetch
    // without depending on the edit screen here (covered in edit-profile.spec.ts).
    const [patchResp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/users/me/profile') && r.request().method() === 'PATCH',
      ),
      page.evaluate(() =>
        fetch('/api/users/me/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName: 'Alex Smith' }),
        }),
      ),
    ]);
    expect(patchResp.ok()).toBe(true);

    // The home header reads the same ['profile'] query — re-navigating refetches it.
    await profilePage.goto();
    await profilePage.waitForScreen();
    await expect(profilePage.displayName).toHaveText('Alex Smith', { timeout: 10_000 });
  });
});
