import type { Locator, Page } from '@playwright/test';
import { AUDIT_LOG_TEST_IDS } from '../selectors';
import { DxGridPage } from './dx-grid.base';

/**
 * Page Object for the Audit Logs page.
 * Encapsulates all selectors and common actions — tests stay DRY.
 */
export class AuditLogsPage extends DxGridPage {
  readonly pageContainer: Locator;

  constructor(page: Page) {
    const pageContainer = page.getByTestId(AUDIT_LOG_TEST_IDS.page);
    super(page, pageContainer);
    this.pageContainer = pageContainer;
  }

  async goto() {
    await this.page.goto('/audit-logs');
  }

  /**
   * Submits the toolbar search (GridSearchBox). Server-side FilterText matches
   * entityName, entityId, userId and the value diffs (AuditLogRepository), so an
   * entity id here scopes the grid to exactly that entity's entries.
   *
   * Deliberately no Enter press: GridSearchBox is a controlled input whose keydown
   * handler reads the `value` PROP — pressing Enter right after fill() submits the
   * stale pre-fill value AND cancels the pending debounce timer, so the real search
   * never fires. The debounce path closes over the fresh text; let it do the submit.
   */
  async searchByText(text: string): Promise<void> {
    const input = this.pageContainer.getByPlaceholder(/search/i);
    await input.fill(text);
  }

  /** Opens the kebab ActionMenu on the first data row and clicks View. */
  async openFirstRowDetail(): Promise<void> {
    const firstRow = this.dataRows.first();
    await firstRow.getByRole('button', { name: /^actions$/i }).click();
    // The menu is portalled to document.body, so locate it at page level.
    await this.page.getByRole('menuitem', { name: /^view$/i }).click();
  }

  /**
   * The detail DrawerPanel's dialog. The drawer container stays mounted when
   * closed (it animates), but the panel carries aria-hidden while closed, so a
   * role query only resolves when the drawer is actually open.
   */
  get detailPopup(): Locator {
    return this.page.getByTestId(AUDIT_LOG_TEST_IDS.detailDrawer).getByRole('dialog');
  }

  get detailPopupTitle(): Locator {
    return this.detailPopup.getByRole('heading').first();
  }
}
