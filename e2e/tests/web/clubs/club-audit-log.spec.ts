import { expect, test } from '@playwright/test';
import { AuditLogsPage } from '../../../playwright/pages/audit-logs.page';
import { ClubsPage } from '../../../playwright/pages/clubs.page';
import { loginAsAdmin } from '../../../playwright/utils/auth';

/**
 * Cross-feature integration flow: Club CRUD → Audit Log verification.
 *
 * Sequence (serial — each step builds on the previous):
 *   1. Create a club via the UI, confirm the row appears in the accordion.
 *   2. Update the club name via the UI, confirm the row updates.
 *   3. Delete the club via the UI, confirm the row is removed.
 *   4. On the Audit Logs page, verify Insert/Update/Delete entries exist for the
 *      club (real backend). Skipped automatically if the E2E user lacks
 *      audit-log:read (403) or the audit-log grid isn't available.
 *
 * The club ID is captured from the POST response in Step 1 so the audit log
 * can be filtered precisely with no risk of false positives.
 */
test.describe
  .serial('Club CRUD → Audit Log integration', () => {
    let clubsPage: ClubsPage;
    let auditLogsPage: AuditLogsPage;

    const stamp = Date.now();
    const uniqueName = `E2E-AuditFlow-${stamp}`;
    const updatedName = `E2E-AuditUpd-${stamp}`;

    // Captured in Step 1, referenced in Step 4.
    let clubId: string | undefined;

    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      clubsPage = new ClubsPage(page);
      auditLogsPage = new AuditLogsPage(page);
    });

    test('Step 1 — creates a club and shows it in the accordion', async ({ page }) => {
      await clubsPage.goto();
      await clubsPage.waitForLoad();

      await clubsPage.addButton.click();
      await expect(clubsPage.addDrawer).toBeVisible();
      await clubsPage.fillAddAndSubmit(
        uniqueName,
        { street: '1 Test Street', city: 'Denver', state: 'CO' },
        // First season is mandatory at creation — dd/MM/yyyy per the admin picker.
        { start: '15/01/2026', end: '15/06/2026' },
      );

      const [createResponse] = await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().includes('/api/clubs') &&
            resp.request().method() === 'POST' &&
            resp.status() === 201,
        ),
        clubsPage.confirmDialogAction(),
      ]);
      clubId = (await createResponse.json()).id as string;
      expect(clubId).toBeTruthy();

      await expect(clubsPage.rowByName(uniqueName)).toBeVisible({ timeout: 10_000 });
    });

    test('Step 2 — updates the club name', async ({ page }) => {
      await clubsPage.goto();
      await clubsPage.waitForLoad();

      await clubsPage.clickEdit(uniqueName);
      await expect(clubsPage.editDrawer).toBeVisible({ timeout: 5_000 });

      const [updateResponse] = await Promise.all([
        page.waitForResponse(
          (resp) => resp.url().includes('/api/clubs') && resp.request().method() === 'PUT',
        ),
        clubsPage.fillEditAndSubmit(updatedName),
      ]);
      expect(updateResponse.status()).toBe(200);

      await expect(clubsPage.rowByName(updatedName)).toBeVisible({ timeout: 10_000 });
      await expect(clubsPage.rowByName(uniqueName)).toHaveCount(0);
    });

    test('Step 3 — deletes the club', async ({ page }) => {
      await clubsPage.goto();
      await clubsPage.waitForLoad();

      await clubsPage.clickDelete(updatedName);

      const [deleteResponse] = await Promise.all([
        page.waitForResponse(
          (resp) => resp.url().includes('/api/clubs') && resp.request().method() === 'DELETE',
        ),
        clubsPage.confirmDialogAction(),
      ]);
      expect(deleteResponse.status()).toBe(204);

      await expect(clubsPage.rowByName(updatedName)).toHaveCount(0, { timeout: 10_000 });
    });

    test('Step 4 — audit log shows Insert, Update, and Delete for the club', async ({ page }) => {
      if (!clubId) {
        test.skip(true, 'Club ID not captured — Step 1 may have failed.');
        return;
      }

      await auditLogsPage.goto();

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

      if (!gridSettled || (await auditLogsPage.gridErrorMessage.isVisible())) {
        test.skip(
          true,
          'Audit log unavailable (likely 403 — assign audit-log:read to the E2E user).',
        );
        return;
      }

      // The grid no longer renders an Entity ID column, so rows cannot be matched on the
      // club id's text. Instead scope the whole grid to this club via the toolbar search —
      // backend FilterText matches EntityId AND the value diffs, so the club's first
      // Season (whose NewValues embed the club id) rides along. Assert on the Club rows.
      await auditLogsPage.searchByText(clubId);
      // Row cells concatenate with no separator in textContent ("…10:01ClubDelete…"), so a
      // \b-anchored hasText regex can never match — filter on the Entity type CELL instead.
      const clubRows = auditLogsPage.dataRows.filter({
        has: page.getByRole('gridcell', { name: 'Club', exact: true }),
      });
      await expect(clubRows).toHaveCount(3, { timeout: 15_000 });
      await expect(clubRows.filter({ hasText: 'Insert' })).toBeVisible();
      await expect(clubRows.filter({ hasText: 'Update' })).toBeVisible();
      await expect(clubRows.filter({ hasText: 'Delete' })).toBeVisible();
    });
  });
