import { expect, test } from '@playwright/test';
import { AuditLogsPage } from '../../../playwright/pages/audit-logs.page';
import { loginAsAdmin } from '../../../playwright/utils/auth';
import { fulfillJson, getPageParams } from '../../../playwright/utils/mock-routes';

/**
 * The LIST endpoint only — deliberately not a glob.
 *
 * The previous double-star glob over `api/audit-logs` also matched
 * `/api/audit-logs/entity-names`, which the filter toolbar calls and expects to be a string
 * array. Fulfilling it with the list shape `{ items, totalCount }` made `entityNames.map`
 * throw in audit-log-grid-toolbar.tsx, so the page died on a Next.js client-side exception
 * and every test in this file failed on the error overlay rather than on what it asserted.
 *
 * A glob cannot express 'not a sub-path' here: Playwright treats `?` as a single-character
 * wildcard, so `audit-logs?*` still matches `audit-logs/entity-names`. Hence a RegExp.
 */
const AUDIT_LOGS_LIST_ROUTE = /\/api\/audit-logs(\?|$)/;

test.describe('Audit Logs Page', () => {
  let auditLogsPage: AuditLogsPage;

  // Authenticate before each test — no shared storage state, follow existing pattern.
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    auditLogsPage = new AuditLogsPage(page);
    await auditLogsPage.goto();
    await expect(page).toHaveURL(/.*audit-logs/);
  });

  test.describe('Page rendering', () => {
    test('renders the page container and page heading', async ({ page }) => {
      await expect(auditLogsPage.pageContainer).toBeVisible();
      await expect(page.getByRole('heading', { name: /audit logs/i })).toBeVisible();
    });

    test('renders the data grid', async () => {
      await expect(auditLogsPage.grid).toBeVisible();
    });

    test('renders expected column headers', async ({ page }) => {
      // Intercept the API so the grid renders a successful (empty) response
      // regardless of the E2E user's role — this test is about UI structure, not RBAC.
      await page.route(AUDIT_LOGS_LIST_ROUTE, (route) =>
        fulfillJson(route, { items: [], totalCount: 0 }),
      );
      await auditLogsPage.goto();

      const headers = await auditLogsPage.getColumnHeaders();
      expect(headers).toEqual(
        expect.arrayContaining(['Timestamp', 'Entity type', 'Action', 'User']),
      );
    });
  });

  test.describe('Backend integration', () => {
    test('loads audit log records from the backend', async () => {
      // Poll until DX settles into one of its three terminal states:
      //   data rows rendered  |  no-data text  |  API error banner (e.g. 403)
      // Sequential waitFor calls are used instead of Locator.or() to avoid
      // strict-mode violations when multiple locators match simultaneously.
      const gridSettled = await auditLogsPage.dataRows
        .first()
        .waitFor({ state: 'visible', timeout: 15_000 })
        .then(() => true)
        .catch(() =>
          auditLogsPage.noDataText
            .waitFor({ state: 'visible', timeout: 3_000 })
            .then(() => true)
            .catch(() =>
              auditLogsPage.gridErrorMessage
                .waitFor({ state: 'visible', timeout: 3_000 })
                .then(() => true)
                .catch(() => false),
            ),
        );

      expect(gridSettled).toBe(true);
    });

    test('shows no-records message when the grid is empty', async ({ page }) => {
      // Mock the API with an empty successful response to test the no-records UI state
      await page.route(AUDIT_LOGS_LIST_ROUTE, (route) =>
        fulfillJson(route, { items: [], totalCount: 0 }),
      );
      await auditLogsPage.goto();

      await expect(auditLogsPage.grid.locator('.dx-loadpanel')).not.toBeVisible({ timeout: 10000 });
      await expect(auditLogsPage.noDataText).toContainText(/no records/i);
    });

    test('shows server error message when backend is unavailable', async ({ page }) => {
      // Intercept all audit log API calls and return a 500
      await page.route(AUDIT_LOGS_LIST_ROUTE, (route) =>
        route.fulfill({ status: 500, body: 'Internal Server Error' }),
      );

      await auditLogsPage.goto();

      // EntityDataGrid calls notify() with the loadError message on data error. `.first()` —
      // a retried load can fire it twice, and DX shows a distinct toast for each.
      await expect(page.getByText(/failed to load/i).first()).toBeVisible({ timeout: 10000 });
    });
  });

  // ─── Column sorting ──────────────────────────────────────────────────────────
  //
  // With RemoteOperations sorting enabled, DX forwards sort state to the CustomStore
  // as loadOptions.sort → createGridStore extracts it and the datasource passes
  // SortBy / SortDescending query params to the backend.

  test.describe('Column sorting', () => {
    test('initial load sends SortBy=timestamp&SortDescending=true (column default)', async ({
      page,
    }) => {
      // Navigate away first so the singleton store is re-initialised on the next goto
      await page.goto('/clubs');

      await page.route(AUDIT_LOGS_LIST_ROUTE, (route) =>
        fulfillJson(route, {
          items: [
            {
              id: 'log-002',
              entityName: 'Club',
              entityId: 'e002',
              action: 'Update',
              userId: 'u1',
              timestamp: '2025-06-01T08:00:00Z',
            },
            {
              id: 'log-001',
              entityName: 'Club',
              entityId: 'e001',
              action: 'Insert',
              userId: 'u1',
              timestamp: '2025-01-01T08:00:00Z',
            },
          ],
          totalCount: 2,
        }),
      );

      // waitForRequest races with goto — gate on the request before asserting URL params.
      // Match the LIST call only: the filter toolbar also fires /api/audit-logs/entity-names,
      // which carries no sort params and would fail the assertions below.
      const [initialRequest] = await Promise.all([
        page.waitForRequest((req) => AUDIT_LOGS_LIST_ROUTE.test(req.url()), { timeout: 10_000 }),
        auditLogsPage.goto(),
      ]);

      const url = initialRequest.url();
      // Verify backend received the sort params from the column's initial sortOrder:'desc'
      expect(url).toContain('SortBy=timestamp');
      expect(url).toContain('SortDescending=true');

      // Rows should render in the order received from the server (newest first)
      await auditLogsPage.waitForGridLoad();
      await expect(auditLogsPage.dataRows.nth(0)).toContainText('Update');
      await expect(auditLogsPage.dataRows.nth(1)).toContainText('Insert');
    });

    test('clicking a column header sends updated sort params to backend', async ({ page }) => {
      const capturedUrls: string[] = [];

      await page.route(AUDIT_LOGS_LIST_ROUTE, (route) => {
        capturedUrls.push(route.request().url());
        void fulfillJson(route, {
          items: [
            {
              id: 'log-a',
              entityName: 'Alpha',
              entityId: 'e1',
              action: 'Insert',
              userId: 'u1',
              timestamp: '2025-01-01T00:00:00Z',
            },
            {
              id: 'log-b',
              entityName: 'Beta',
              entityId: 'e2',
              action: 'Update',
              userId: 'u1',
              timestamp: '2025-06-01T00:00:00Z',
            },
          ],
          totalCount: 2,
        });
      });

      await auditLogsPage.goto();
      await auditLogsPage.waitForGridLoad();

      // Click the Entity type header to sort ASC by entityName — triggers a new server request
      const [sortRequest] = await Promise.all([
        page.waitForRequest(
          (req) => req.url().includes('api/audit-logs') && req.url().includes('SortBy=entityName'),
        ),
        auditLogsPage.grid
          .locator('.dx-header-row [role="columnheader"]')
          .filter({ hasText: /^Entity type$/ })
          .click(),
      ]);

      const sortUrl = sortRequest.url();
      expect(sortUrl).toContain('SortBy=entityName');
      expect(sortUrl).toContain('SortDescending=false');
    });
  });

  // ─── Pagination ──────────────────────────────────────────────────────────────

  test.describe('Pagination', () => {
    test('pager is visible when totalCount exceeds the page size', async ({ page }) => {
      // totalCount=60 > defaultPageSize=50 → DX renders a pager with 2 pages.
      // Navigate away first so the return trip is a cross-route hard reload,
      // guaranteeing the auditLogStore singleton is recreated fresh.
      const page1Items = Array.from({ length: 50 }, (_, i) => ({
        id: `log-${i}`,
        entityName: 'Club',
        entityId: `e${i}`,
        action: 'Insert',
        userId: 'u1',
        // Valid ISO 8601: pad seconds to 2 digits (max index=49)
        timestamp: `2025-01-01T00:00:${String(i).padStart(2, '0')}Z`,
      }));

      await page.goto('/clubs');
      await page.route(AUDIT_LOGS_LIST_ROUTE, (route) =>
        fulfillJson(route, { items: page1Items, totalCount: 60 }),
      );

      await auditLogsPage.goto();
      await expect(auditLogsPage.dataRows.first()).toBeVisible({ timeout: 10_000 });

      // Scope pager check to the page container (DX may render it outside .dx-datagrid)
      await expect(auditLogsPage.pageContainer.locator('.dx-pager')).toBeVisible();
      await expect(auditLogsPage.dataRows).toHaveCount(50);
    });

    test('navigating to page 2 sends Page=2 and the default PageSize to the backend', async ({
      page,
    }) => {
      const page1Items = Array.from({ length: 50 }, (_, i) => ({
        id: `log-${i}`,
        entityName: 'Club',
        entityId: `e${i}`,
        action: 'Insert',
        userId: 'u1',
        // Valid ISO 8601: pad seconds to 2 digits
        timestamp: `2025-01-01T00:00:${String(i).padStart(2, '0')}Z`,
      }));
      const page2Items = [
        {
          id: 'log-50',
          entityName: 'Tag',
          entityId: 'tag-1',
          action: 'Delete',
          userId: 'u1',
          timestamp: '2025-01-01T00:00:50Z',
        },
      ];

      await page.goto('/clubs');
      await page.route(AUDIT_LOGS_LIST_ROUTE, (route) => {
        const { page: pageParam } = getPageParams(route.request().url());
        return fulfillJson(
          route,
          pageParam === '2'
            ? { items: page2Items, totalCount: 51 }
            : { items: page1Items, totalCount: 51 },
        );
      });

      await auditLogsPage.goto();
      await auditLogsPage.waitForGridLoad();

      // Click "Next" and gate on the page-2 response before asserting
      const [page2Response] = await Promise.all([
        page.waitForResponse(
          (resp) => {
            const u = new URL(resp.url());
            const p = u.searchParams.get('Page') ?? u.searchParams.get('page');
            return resp.url().includes('/api/audit-logs') && p === '2';
          },
          { timeout: 15_000 },
        ),
        auditLogsPage.pageContainer.locator('.dx-pager .dx-navigate-button.dx-next-button').click(),
      ]);

      // Verify the correct pagination params were sent to the backend.
      // PageSize mirrors uiConfig.grid.defaultPageSize (10).
      const { page: sentPage, pageSize: sentPageSize } = getPageParams(page2Response.url());
      expect(sentPage).toBe('2');
      expect(sentPageSize).toBe('10');

      // Verify page 2 data is rendered
      await auditLogsPage.waitForGridLoad();
      await expect(auditLogsPage.dataRows).toHaveCount(1);
      await expect(auditLogsPage.dataRows.first()).toContainText('Tag');
    });
  });

  test.describe('Detail popup', () => {
    test('opens detail popup when a row with diffs has its view action clicked', async () => {
      const rowCount = await auditLogsPage.dataRows.count();
      test.skip(rowCount === 0, 'No audit log rows available to test popup');

      await auditLogsPage.openFirstRowDetail();

      await expect(auditLogsPage.detailPopup).toBeVisible({ timeout: 5000 });
      await expect(auditLogsPage.detailPopupTitle).toBeVisible();
    });

    test('closes detail popup on outside click', async ({ page: _page }) => {
      const rowCount = await auditLogsPage.dataRows.count();
      test.skip(rowCount === 0, 'No audit log rows available to test popup');

      await auditLogsPage.openFirstRowDetail();
      await expect(auditLogsPage.detailPopup).toBeVisible({ timeout: 5000 });

      // Click outside the popup to dismiss it
      await _page.mouse.click(10, 10);
      await expect(auditLogsPage.detailPopup).not.toBeVisible({ timeout: 5000 });
    });
  });
});
