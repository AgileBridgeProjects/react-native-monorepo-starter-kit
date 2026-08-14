import type { Locator, Page } from '@playwright/test';

/**
 * Abstract base class for Page Objects that wrap a DevExtreme DataGrid.
 *
 * Provides the common grid locators and utility methods shared by every
 * grid-based page in the admin portal. Subclasses pass their page-level
 * container `Locator` to the constructor so all selectors stay properly scoped.
 *
 * @example
 * export class TopicsPage extends DxGridPage {
 *   constructor(page: Page) {
 *     super(page, page.getByTestId(CLUB_TEST_IDS.page));
 *   }
 * }
 */
export abstract class DxGridPage {
  /** The DevExtreme DataGrid rendered by EntityDataGrid. */
  readonly grid: Locator;

  /** Column header text nodes inside the DX DataGrid header row. */
  readonly columnHeaders: Locator;

  constructor(
    protected readonly page: Page,
    pageContainer: Locator,
  ) {
    this.grid = pageContainer.locator('.dx-datagrid');
    this.columnHeaders = this.grid.locator('.dx-datagrid-headers .dx-datagrid-text-content');
  }

  /** All visible data rows in the grid. */
  get dataRows(): Locator {
    return this.grid.locator('.dx-data-row');
  }

  /** The DX no-data text element (shown when the grid is empty). */
  get noDataText(): Locator {
    return this.grid.locator('.dx-datagrid-nodata');
  }

  /** DX error banner shown inside the grid when an API request fails. */
  get gridErrorMessage(): Locator {
    return this.grid.locator('.dx-error-message');
  }

  /** Returns the text of all visible column headers. */
  async getColumnHeaders(): Promise<string[]> {
    await this.columnHeaders.first().waitFor({ state: 'visible' });
    return this.columnHeaders.allTextContents();
  }

  /**
   * Waits for the DX grid load panel to be hidden, indicating the current
   * data-fetch cycle has finished (success or error).
   *
   * Always call this after navigating to a grid page and after any action
   * that triggers a reload (sort, pagination, mutation success).
   */
  async waitForGridLoad(timeout = 10_000): Promise<void> {
    await this.grid.locator('.dx-loadpanel').waitFor({ state: 'hidden', timeout });
  }
}
