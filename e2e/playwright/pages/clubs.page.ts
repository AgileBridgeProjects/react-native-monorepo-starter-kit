import type { Locator, Page } from '@playwright/test';
import { CLUB_TEST_IDS } from '../selectors';

/**
 * Page Object for the Clubs page.
 *
 * The page renders an **AccordionGrid** (not cards, not a DxDataGrid): each
 * club is a `role="treeitem"` row inside `data-testid="clubs-accordion"`,
 * with a trailing per-row ActionMenu (`aria-label="Actions for <name>"`) whose
 * items are Add team / Edit / Delete.
 *
 * - Add club  → header button `clubs-add-button` → `add-club-drawer`
 * - Edit club → row menu → "Edit" → `edit-club-drawer`
 * - Delete       → row menu → "Delete" → `confirm-dialog`
 *
 * Both drawers embed the same `ClubDrawer`, so the name/subdomain fields
 * (`#club-name`, `#club-street-address`, `#club-city`, `#club-state`) and the submit
 * button (`club-submit-button`) are scoped to the relevant drawer locator.
 */
export class ClubsPage {
  readonly page: Page;
  readonly pageContainer: Locator;
  readonly addButton: Locator;
  readonly accordion: Locator;
  readonly addDrawer: Locator;
  readonly editDrawer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageContainer = page.getByTestId(CLUB_TEST_IDS.page);
    this.addButton = page.getByTestId(CLUB_TEST_IDS.addButton);
    this.accordion = page.getByTestId(CLUB_TEST_IDS.accordion);
    this.addDrawer = page.getByTestId(CLUB_TEST_IDS.addDrawer);
    this.editDrawer = page.getByTestId(CLUB_TEST_IDS.editDrawer);
  }

  async goto(): Promise<void> {
    await this.page.goto('/clubs');
  }

  /** Waits for the page container + accordion to render. */
  async waitForLoad(): Promise<void> {
    await this.pageContainer.waitFor({ state: 'visible', timeout: 15_000 });
    await this.accordion.waitFor({ state: 'visible', timeout: 15_000 });
  }

  // ─── Rows (AccordionGrid treeitems) ──────────────────────────────────────────

  /** All club rows. */
  get rows(): Locator {
    return this.accordion.getByRole('treeitem');
  }

  /**
   * The row whose text contains the club name. `filter({ hasText })` matches
   * across all row content (name + badges), so it is robust to truncation.
   */
  rowByName(name: string): Locator {
    return this.rows.filter({ hasText: name });
  }

  /** Opens a row's ActionMenu (aria-label "Actions for <name>"). */
  async openRowMenu(name: string): Promise<void> {
    await this.page.getByRole('button', { name: `Actions for ${name}` }).click();
  }

  async clickEdit(name: string): Promise<void> {
    await this.clickRowMenuItem(name, /edit/i, this.editDrawer);
  }

  async clickDelete(name: string): Promise<void> {
    await this.clickRowMenuItem(name, /delete/i, this.confirmDialog);
  }

  /**
   * Opens the row's ActionMenu and clicks an item, retrying once if the click was lost.
   *
   * The ActionMenu portal repositions itself right after opening (measure → flip), so a
   * click racing that move can land on the backdrop instead — the menu then closes via
   * its outside-click handler without selecting anything. `expectedResult` is whatever
   * the item opens (drawer / confirm dialog); if it hasn't appeared shortly after the
   * click, the click was swallowed and the whole gesture is retried once.
   */
  private async clickRowMenuItem(
    name: string,
    item: RegExp,
    expectedResult: Locator,
  ): Promise<void> {
    await this.openRowMenu(name);
    await this.page.getByRole('menuitem', { name: item }).click();
    try {
      await expectedResult.waitFor({ state: 'visible', timeout: 2_000 });
    } catch {
      await this.openRowMenu(name);
      await this.page.getByRole('menuitem', { name: item }).click();
      await expectedResult.waitFor({ state: 'visible', timeout: 5_000 });
    }
  }

  // ─── Drawer form (shared ClubDrawer) ──────────────────────────────────────

  private nameInput(drawer: Locator): Locator {
    return drawer.locator('#club-name');
  }

  private streetAddressInput(drawer: Locator): Locator {
    return drawer.locator('#club-street-address');
  }

  private cityInput(drawer: Locator): Locator {
    return drawer.locator('#club-city');
  }

  private stateSelect(drawer: Locator): Locator {
    return drawer.locator('#club-state');
  }

  private submitButton(drawer: Locator): Locator {
    return drawer.getByTestId('club-submit-button');
  }

  /**
   * Fills every field club creation actually requires, then submits.
   *
   * `name` + `subdomain` is what this used to fill. Subdomain no longer exists anywhere in
   * the web app — tenancy stopped being subdomain-based — and the club form now carries a US
   * address instead of the old single "region" field. club-schema.ts requires name,
   * streetAddress, city and a 2-letter state, and the create wizard ADDITIONALLY requires the
   * first season's date range (the identity split: `isSubmitDisabled={!isValid || !hasSeasonDates}` in
   * clubs-page.tsx). Missing any of these leaves the submit disabled and the spec waiting 60s
   * for a POST that was never going to happen.
   */
  async fillAddAndSubmit(
    name: string,
    address: { street: string; city: string; state: string },
    season: { start: string; end: string },
  ): Promise<void> {
    await this.addDrawer.waitFor({ state: 'visible' });
    await this.dxFill(this.nameInput(this.addDrawer), name);
    await this.dxFill(this.streetAddressInput(this.addDrawer), address.street);
    await this.dxFill(this.cityInput(this.addDrawer), address.city);
    await this.selectState(this.addDrawer, address.state);
    await this.fillSeasonDates(this.addDrawer, season.start, season.end);
    await this.submitButton(this.addDrawer).click();
  }

  /**
   * Fills the first-season DateRangeBox (start + end inputs of the same DX widget).
   *
   * The widget runs with `useMaskBehavior: true` and displayFormat dd/MM/yyyy, so values
   * must arrive as real keystrokes in that format — `fill()` bypasses the mask and DX
   * discards it. Tab afterwards blurs the field, which commits the value and closes the
   * calendar dropdown. Do NOT use Escape here: DrawerPanel's own ESC handler treats it as
   * "close the drawer", and with a dirty form that opens the unsaved-changes ConfirmDialog
   * over everything.
   */
  private async fillSeasonDates(drawer: Locator, start: string, end: string): Promise<void> {
    const inputs = drawer.locator('.dx-daterangebox .dx-texteditor-input');
    await inputs.nth(0).click();
    await inputs.nth(0).pressSequentially(start);
    await inputs.nth(1).click();
    await inputs.nth(1).pressSequentially(end);
    await this.page.keyboard.press('Tab');
  }

  /**
   * Picks a state from the DevExtreme SelectBox.
   *
   * Same open-then-click-the-overlay-item shape the users POM uses for its role/team
   * selects — DX renders its list in a detached overlay, so the option is not inside the
   * drawer and cannot be reached from the field's own locator.
   */
  private async selectState(drawer: Locator, state: string): Promise<void> {
    await this.stateSelect(drawer).click();
    await this.page
      .locator('.dx-overlay-content .dx-list-item')
      .filter({ hasText: state })
      .first()
      .click();
  }

  /** Fills the edit-club drawer's name field and saves. */
  async fillEditAndSubmit(name: string): Promise<void> {
    await this.editDrawer.waitFor({ state: 'visible' });
    await this.dxFill(this.nameInput(this.editDrawer), name);
    await this.submitButton(this.editDrawer).click();
  }

  private async dxFill(input: Locator, value: string): Promise<void> {
    // These are DevExtreme TextBoxes with valueChangeEvent="input", so they react to the
    // native input event `fill()` dispatches and the value reaches react-hook-form. A field
    // configured with the DX default (valueChangeEvent="change") would need real keystrokes
    // instead — check before adding one here.
    await input.fill(value);
  }

  // ─── Confirm dialog ──────────────────────────────────────────────────────────

  get confirmDialog(): Locator {
    return this.page.getByTestId('confirm-dialog');
  }

  /**
   * Clicks the primary action on the ConfirmDialog. Both the create flow
   * (drawer submit → confirm) and the delete flow route through this dialog;
   * the label varies (Create club / Confirm / Delete), so match broadly and
   * exclude the Cancel button.
   *
   * DX's `Popup` animates in, and the click occasionally lands mid-animation and
   * never registers — the button stays enabled and the dialog stays open with no
   * request ever sent, which then surfaces 60s later as an unrelated
   * `page.waitForResponse` timeout at the call site with no clue the click itself
   * was lost. A real click either flips the button to `disabled`/`aria-busy` (the
   * mutation's `isLoading`) or, for a fast mutation, closes the dialog outright —
   * racing both signals (rather than checking only one) avoids a false "lost click"
   * read for a success that happened to land in the gap between them, which would
   * otherwise fire a spurious second click into the dialog's closing animation.
   * Retries the click once if neither signal shows up.
   */
  async confirmDialogAction(): Promise<void> {
    await this.confirmDialog.waitFor({ state: 'visible' });
    const confirmButton = this.confirmDialog.getByRole('button', {
      name: /create|confirm|delete|yes|save/i,
    });

    // force: true — a reopened confirm dialog can leave a backdrop from the outgoing
    // transition briefly overlapping the incoming button, which Playwright's actionability
    // check reports as "intercepts pointer events" and stalls the click for its default
    // timeout. The element is genuinely there and genuinely the right one, so skip the
    // actionability check and dispatch straight to it.
    await confirmButton.click({ force: true });

    const registered = await Promise.race([
      confirmButton
        .and(this.page.locator('[disabled]'))
        .waitFor({ state: 'visible', timeout: 1_500 })
        .then(() => true)
        .catch(() => false),
      this.confirmDialog
        .waitFor({ state: 'hidden', timeout: 1_500 })
        .then(() => true)
        .catch(() => false),
    ]);

    if (!registered && (await confirmButton.isEnabled().catch(() => false))) {
      await confirmButton.click({ force: true });
    }
  }

  /** @deprecated use {@link confirmDialogAction}. Kept for readability at call sites. */
  async confirmDelete(): Promise<void> {
    await this.confirmDialogAction();
  }
}
