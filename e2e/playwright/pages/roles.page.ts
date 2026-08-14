import type { Locator, Page } from '@playwright/test';
import { ROLES_TEST_IDS } from '../selectors';

/**
 * Page Object for the Roles page and Role drawer.
 */
export class RolesPage {
  readonly page: Page;
  readonly pageContainer: Locator;
  readonly drawer: Locator;
  readonly permissionsEditor: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageContainer = page.getByTestId(ROLES_TEST_IDS.page);
    this.drawer = page.getByTestId(ROLES_TEST_IDS.drawer);
    this.permissionsEditor = page.getByTestId(ROLES_TEST_IDS.permissionsEditor);
  }

  async goto() {
    await this.page.goto('/roles');
  }
}
