/**
 * Sign-out E2E — Expo web.
 *
 * On expo-web the profile-screen logout is gated `!isWeb`, so it never renders;
 * logout lives in the web nav sidebar (md+) and the mobile web drawer. Neither
 * web LogoutButton carries a testID today (see report — recommend adding
 * `PROFILE_TEST_IDS.logoutButton` to components/ui/logout-button.tsx callers),
 * so we target it by its accessible name ("Sign Out").
 *
 * Signing out clears the Supabase session; (tabs)/_layout then redirects to
 * /(auth)/login.
 *
 * Viewport branch:
 *   - ≥768px: the sidebar logout is visible — click it directly.
 *   - <768px: the sidebar is hidden; open the drawer via the hamburger first.
 */

import { expect, test } from '@playwright/test';
import { injectExpoSupabaseAuth } from '../../../playwright/utils/auth';

function isWideWeb(page: import('@playwright/test').Page): boolean {
  return (page.viewportSize()?.width ?? 0) >= 768;
}

test.describe('Sign out', () => {
  test.beforeEach(async ({ page }) => {
    await injectExpoSupabaseAuth(page);
    // Keep the tab data quiet so the authed shell renders without noise.
    // Playwright matches routes in reverse registration order, so this catch-all
    // is registered first and the specific object routes below take precedence.
    await page.route('**/api/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );
    // The home shell reads an XP summary object (`summary.league` etc.); an empty
    // array crashes it into the error boundary, which tears down the nav sidebar
    // (and its Sign Out button) mid-click. Return a valid summary; list-shaped
    // endpoints stay as bare arrays via the catch-all above.
    await page.route('**/api/xp/summary', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          seasonXp: 0,
          league: 'Bronze',
          previousLeague: null,
          currentLeagueThreshold: 0,
          nextLeagueThreshold: 100,
          xpToNextLeague: 100,
          seasonName: 'Season 1',
        }),
      }),
    );
  });

  test('signs out and redirects to login', async ({ page }) => {
    // KNOWN GAP, not a flaky spec: on expo-web at desktop widths there is currently no way to
    // sign out at all. profile-screen.tsx hides its logout behind `!isWeb` and defers to "the
    // nav sidebar", but nothing renders one — TabHeader (which owns the menu affordance) only
    // exists as `.ios.tsx` / android-tab-screen, and the profile screen also hides the header
    // on web. So the control this test clicks does not exist, and the failure is real.
    //
    // Marked fixme rather than deleted: sign-out ships and works on native and at mobile-web
    // widths, so deleting would hide a genuine hole in the web target. Reinstate by giving
    // web desktop a reachable logout (and a testID while you are there — see this file's
    // header note), not by loosening the assertion.
    test.fixme(isWideWeb(page), 'no reachable sign-out on expo-web desktop — app gap');

    await page.goto('/');
    // Wait until we are inside the authed shell (off the auth routes).
    await expect(page).not.toHaveURL(/login/, { timeout: 15_000 });

    if (!isWideWeb(page)) {
      // Mobile web: open the nav drawer first. The header hamburger's accessible
      // name comes from `common:portal.openNavigation`; match both the translated
      // string and the raw key (the `common` namespace is missing this entry in
      // the running bundle) so this is resilient either way.
      const hamburger = page.getByRole('button', {
        name: /open navigation|menu|openNavigation/i,
      });
      await hamburger.click();
    }

    const signOut = page.getByRole('button', { name: /sign out/i });
    await signOut.first().click();

    await expect(page).toHaveURL(/login/, { timeout: 15_000 });
  });
});
