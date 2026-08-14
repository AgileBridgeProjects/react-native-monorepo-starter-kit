import type { Locator, Page } from '@playwright/test';
import { AUTH_TEST_IDS, ORG_SWITCH_TEST_IDS } from '../selectors';

/**
 * Page Object for the select-organisation screen (`/select-org`).
 *
 * NOTE: select-org is NOT in the (auth) route group — it lives at
 * `app/select-org.tsx`. Post-login routing sends multi-org users here from
 * `(tabs)/_layout.tsx`. The screen wraps its list in an `AsyncStateView`
 * (loading skeleton / error+retry / content).
 */
export class SelectOrgPage {
  readonly screen: Locator;
  readonly header: Locator;
  readonly drawerSwitchOrgButton: Locator;
  readonly errorRetryButton: Locator;

  constructor(private readonly page: Page) {
    this.screen = page.getByTestId(ORG_SWITCH_TEST_IDS.screen);
    this.header = page.getByTestId(AUTH_TEST_IDS.components.selectOrgHeader);
    this.drawerSwitchOrgButton = page.getByTestId(ORG_SWITCH_TEST_IDS.drawerSwitchOrg);
    // AsyncStateView error action label is "Try again" (selectOrg.retry).
    this.errorRetryButton = page.getByRole('button', { name: /try again/i });
  }

  async goto() {
    await this.page.goto('/select-org');
  }

  getOrgItem(clubId: string): Locator {
    return this.page.getByTestId(ORG_SWITCH_TEST_IDS.orgItem(clubId));
  }

  async selectOrg(clubId: string) {
    await this.getOrgItem(clubId).click();
  }

  async retry() {
    await this.errorRetryButton.click();
  }
}
