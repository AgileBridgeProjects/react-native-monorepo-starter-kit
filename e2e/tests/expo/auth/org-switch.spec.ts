/**
 * Select-organisation E2E — Expo web.
 *
 * Select-org lives at app/select-org.tsx (NOT in the (auth) group). Multi-org
 * users are routed here by (tabs)/_layout.tsx after login; single-org users are
 * auto-switched. We drive the screen directly and mock GET
 * /api/auth/me/organisations — the post-login redirect itself depends on
 * injected auth-store state (activeClubId === null) and is a fixture concern
 * documented for the orchestrator.
 *
 * The list is wrapped in an AsyncStateView (loading skeleton / error+retry /
 * content).
 */

import { expect, test } from '@playwright/test';
import { SelectOrgPage } from '../../../expo/pages/select-org.page';
import { injectExpoSupabaseAuth } from '../../../playwright/utils/auth';
import { fulfillJson } from '../../../playwright/utils/mock-routes';

const ORGS_ENDPOINT = '**/api/auth/me/organisations';

const MULTI_ORG = [
  {
    clubId: '11111111-1111-1111-1111-111111111111',
    clubName: 'Acme Corp',
    clubLogoUrl: null,
  },
  {
    clubId: '22222222-2222-2222-2222-222222222222',
    clubName: 'Beta Industries',
    clubLogoUrl: 'https://example.com/beta-logo.png',
  },
];

test.describe('Select organisation', () => {
  let selectOrgPage: SelectOrgPage;

  test.beforeEach(async ({ page }) => {
    await injectExpoSupabaseAuth(page);
    selectOrgPage = new SelectOrgPage(page);
  });

  test('renders all available organisations', async ({ page }) => {
    await page.route(ORGS_ENDPOINT, (route) => fulfillJson(route, MULTI_ORG));
    await selectOrgPage.goto();

    await expect(selectOrgPage.screen).toBeVisible();
    await expect(selectOrgPage.getOrgItem(MULTI_ORG[0].clubId)).toBeVisible();
    await expect(selectOrgPage.getOrgItem(MULTI_ORG[1].clubId)).toBeVisible();
    await expect(page.getByText('Acme Corp')).toBeVisible();
    await expect(page.getByText('Beta Industries')).toBeVisible();
  });

  test('selecting an org navigates into the app', async ({ page }) => {
    await page.route(ORGS_ENDPOINT, (route) => fulfillJson(route, MULTI_ORG));
    // Keep downstream tab APIs quiet after org selection.
    await page.route('**/api/**', (route) => {
      if (route.request().url().includes('/api/auth/me/organisations')) return route.fallback();
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await selectOrgPage.goto();
    await expect(selectOrgPage.getOrgItem(MULTI_ORG[0].clubId)).toBeVisible();
    // The press fires onPress + router.replace immediately, then the screen
    // navigates away and the FlatList unmounts. Playwright's post-click
    // actionability wait then rejects because the card detaches — swallow that;
    // the navigation is what we actually assert below.
    await selectOrgPage
      .getOrgItem(MULTI_ORG[0].clubId)
      .click({ timeout: 3000 })
      .catch(() => {
        /* card detached as the screen navigated away — expected */
      });

    await expect(page).not.toHaveURL(/select-org/, { timeout: 10_000 });
  });

  test('shows the error state with a retry action on failure', async ({ page }) => {
    await page.route(ORGS_ENDPOINT, (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
    );

    await selectOrgPage.goto();
    await expect(selectOrgPage.screen).toBeVisible();
    await expect(page.getByText(/couldn't load your organisations/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(selectOrgPage.errorRetryButton).toBeVisible();
  });

  test('retry refetches and renders the list on recovery', async ({ page }) => {
    // useOrganisations retries automatically, so the initial fetch fires several
    // attempts. Every attempt in the first cycle must fail for the error state to
    // appear; only once the user taps "Try again" (which we signal via `recovered`)
    // does the endpoint start returning data.
    let recovered = false;
    await page.route(ORGS_ENDPOINT, (route) => {
      if (!recovered) {
        return route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
      }
      return fulfillJson(route, MULTI_ORG);
    });

    await selectOrgPage.goto();
    await expect(selectOrgPage.errorRetryButton).toBeVisible({ timeout: 10_000 });

    recovered = true;
    await selectOrgPage.retry();
    await expect(selectOrgPage.getOrgItem(MULTI_ORG[0].clubId)).toBeVisible({ timeout: 10_000 });
  });
});
