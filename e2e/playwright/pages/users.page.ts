import type { Locator, Page } from '@playwright/test';
import { USERS_TEST_IDS, WORKSPACE_TEST_IDS } from '../selectors';
import { DxGridPage } from './dx-grid.base';

/**
 * Page Object for the Users page and Add User drawer.
 */
export class UsersPage extends DxGridPage {
  readonly pageContainer: Locator;
  readonly addButton: Locator;
  readonly drawer: Locator;

  // Filter bar
  readonly clubFilter: Locator;
  readonly teamFilter: Locator;
  readonly workspaceSelector: Locator;
  readonly clubFlyout: Locator;

  // Add-user form fields
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly roleSelect: Locator;
  readonly teamSelect: Locator;
  readonly authMethodSelect: Locator;
  readonly dropdownOptions: Locator;

  // Role-specific fields
  readonly dateOfBirthInput: Locator;
  readonly positionInput: Locator;
  readonly jerseyNumberInput: Locator;
  readonly teamAssignmentSelect: Locator;
  readonly linkedAthletesSelect: Locator;
  readonly parentGuardianEmailInput: Locator;

  // Edit/delete/suspend actions
  readonly deleteButton: Locator;
  readonly toggleActiveButton: Locator;
  /**
   * The selection toolbar's bulk action button — only rendered once ≥1 row is selected
   * (there is no standing, merely-disabled button for the zero-selection case). Enable and
   * Disable always collapse into one "Enable/Disable" toggle (`showEnable`/`showDisable` in
   * user-grid.tsx are both simply `selectedKeys.length > 0`), so this is that combined button,
   * not a disable-only one — see `clickBulkDisable`.
   */
  readonly bulkDisableButton: Locator;

  // Submit / cancel
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  // Change-password drawer
  readonly changePasswordDrawer: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly changePasswordSubmit: Locator;

  constructor(page: Page) {
    const pageContainer = page.getByTestId(USERS_TEST_IDS.page);
    super(page, pageContainer);
    this.pageContainer = pageContainer;
    this.addButton = page.getByTestId(USERS_TEST_IDS.addButton);
    // The testid is on DrawerPanel's OUTER wrapper, which stays mounted (and "visible" to
    // Playwright) even while closed — its `role="dialog"` child carries aria-hidden for real
    // open/closed state, so visibility assertions must target `dialogPanel`, not this.
    this.drawer = page.getByTestId(USERS_TEST_IDS.drawer);

    // Filter selects (use input id attributes from UserFilterBar)
    this.clubFilter = page.locator('#club-filter');
    this.teamFilter = page.locator('#team-filter');
    this.workspaceSelector = page.getByTestId(WORKSPACE_TEST_IDS.clubSelector).first();
    this.clubFlyout = page.getByTestId(WORKSPACE_TEST_IDS.clubFlyout);

    // Drawer form inputs (use input id attributes from AddUserDrawer)
    this.firstNameInput = page.locator('#user-first-name');
    this.lastNameInput = page.locator('#user-last-name');
    this.emailInput = page.locator('#user-email');
    this.phoneInput = page.locator('#user-phone');
    this.roleSelect = page.locator('#user-role');
    this.teamSelect = page.locator('#user-team');
    this.authMethodSelect = page.locator('#user-auth-method');
    this.dropdownOptions = page.locator('.dx-overlay-content .dx-list-item');

    // Role-specific fields
    this.dateOfBirthInput = page.locator('#user-date-of-birth');
    this.positionInput = page.locator('#user-position');
    this.jerseyNumberInput = page.locator('#user-jersey-number');
    this.teamAssignmentSelect = page.locator('#user-team-assignment');
    this.linkedAthletesSelect = page.locator('#user-linked-athletes');
    this.parentGuardianEmailInput = page.locator('#user-parent-guardian-email');

    // Edit/delete/suspend
    this.deleteButton = page.getByTestId(USERS_TEST_IDS.deleteButton);
    this.toggleActiveButton = page.getByTestId(USERS_TEST_IDS.toggleActiveButton);
    this.bulkDisableButton = page.getByRole('button', { name: /^enable\/disable$/i });

    // EntityFormShell buttons inside the drawer. By testid, not label text — the submit
    // label differs by mode ("Create User" vs "Save Changes"), while `submitTestId` is the
    // same in both (see user-drawer.tsx's DrawerFooter).
    this.submitButton = this.drawer.getByTestId('user-submit-button');
    this.cancelButton = this.drawer.getByRole('button', { name: /cancel/i });

    // Change-password drawer (separate DrawerPanel from the add/edit drawer). The testid
    // is on DrawerPanel's OUTER wrapper, which stays mounted (and "visible" to Playwright)
    // even while closed — its `role="dialog"` child carries aria-hidden for real open/closed
    // state, so visibility assertions must target that, not the wrapper (see `changePasswordDialog`).
    this.changePasswordDrawer = page.getByTestId(USERS_TEST_IDS.changePasswordDrawer);
    this.newPasswordInput = page.locator('#new-password');
    this.confirmPasswordInput = page.locator('#confirm-password');
    this.changePasswordSubmit = page.getByTestId(USERS_TEST_IDS.changePasswordSubmit);
  }

  async goto() {
    await this.page.goto('/users');
  }

  async waitForLoad() {
    await this.pageContainer.waitFor({ state: 'visible' });
  }

  /** Select a club from the filter bar dropdown. */
  async selectClub(name: string): Promise<void> {
    if (await this.clubFilter.isVisible().catch(() => false)) {
      await this.clubFilter.click();
      await this.page
        .locator('.dx-overlay-content .dx-list-item')
        .filter({ hasText: name })
        .click();
      return;
    }

    await this.workspaceSelector.click();
    await this.clubFlyout.waitFor({ state: 'visible', timeout: 10_000 });
    const option = this.clubFlyout.getByRole('option').filter({ hasText: name });
    await option.waitFor({ state: 'visible', timeout: 10_000 });
    await option.click();
  }

  /** Select a team from the filter bar dropdown. */
  async selectTeam(name: string): Promise<void> {
    await this.teamFilter.click();
    await this.page.locator('.dx-overlay-content .dx-list-item').filter({ hasText: name }).click();
  }

  /** The add/edit drawer's actual dialog — reflects real open/closed state (see `drawer`). */
  get dialogPanel(): Locator {
    return this.drawer.getByRole('dialog');
  }

  /** Opens the Add User drawer. */
  async openAddDrawer(): Promise<void> {
    await this.addButton.click();
    await this.dialogPanel.waitFor({ state: 'visible' });
  }

  /**
   * Click the edit button, optionally scoped to a grid row containing the given text.
   *
   * The grid renders a per-row `ActionMenu` (kebab, `aria-label="Actions for <name>"`) rather
   * than a dedicated edit icon — its dropdown portals to `document.body`, so only the trigger
   * button is scoped to the row; the "Edit User" menu item is always looked up page-wide.
   */
  async clickEditButton(rowText?: string): Promise<void> {
    const scope = rowText ? this.page.locator('tr', { hasText: rowText }) : this.page;
    await scope
      .getByRole('button', { name: /^Actions for /i })
      .first()
      .click();
    await this.page.getByRole('menuitem', { name: /edit/i }).click();
    await this.dialogPanel.waitFor({ state: 'visible' });
  }

  /** Checks a row's selection checkbox by the user's display name (`GridCheckbox`, native input). */
  async selectRowCheckbox(name: string): Promise<void> {
    await this.page.getByRole('checkbox', { name: `Select ${name}` }).check();
  }

  /** Click the delete button inside the edit drawer. */
  async clickDeleteButton(): Promise<void> {
    await this.deleteButton.click();
  }

  /** Click the suspend/activate toggle button inside the edit drawer. */
  async clickToggleActiveButton(): Promise<void> {
    await this.toggleActiveButton.click();
  }

  /** Click the bulk-disable button in the toolbar. */
  async clickBulkDisable(): Promise<void> {
    await this.bulkDisableButton.click();
  }

  /**
   * The shared `ConfirmDialog` (`useConfirm()` hook) used for every save/delete/suspend/
   * activate/link confirmation this drawer raises — one React component, not a DX popup.
   */
  get confirmDialog(): Locator {
    return this.page.getByTestId('confirm-dialog');
  }

  /**
   * Accepts whichever confirm-dialog is currently open. `ConfirmDialog` always renders
   * exactly two buttons — Cancel first, then the primary/danger action — so the last one
   * is always the confirm action regardless of its dynamic label ("Create user",
   * "Save changes", "Delete user", "Disable user", "Activate user", "Link user", …).
   *
   * `ConfirmDialog` is built on DX `Popup`, which animates in — the click occasionally
   * lands mid-animation and never registers, leaving the dialog open and no request
   * sent (see `clubs.page.ts`'s `confirmDialogAction` for the same fix). A real click
   * either flips the button to `disabled`/`aria-busy` (the mutation's `isLoading`) or,
   * for a fast mutation, closes the dialog outright — racing both signals avoids a
   * false "lost click" read for a success landing in the gap between them, which would
   * otherwise fire a spurious second click into the dialog's closing animation.
   */
  async acceptConfirmDialog(): Promise<void> {
    const dialog = this.confirmDialog;
    await dialog.waitFor({ state: 'visible' });
    const confirmButton = dialog.getByRole('button').last();

    // force: true — a dialog reopened immediately after a prior one resolves (e.g. the
    // 409 conflict flow's "Create user?" -> "Link user?" handoff) can leave a backdrop from
    // the outgoing transition briefly overlapping the incoming button; Playwright's
    // actionability check then reports "intercepts pointer events" and stalls the whole
    // click for its default timeout. The element is genuinely there and genuinely the
    // right one, so skip the actionability check and dispatch straight to it.
    await confirmButton.click({ force: true });

    const registered = await Promise.race([
      confirmButton
        .and(this.page.locator('[disabled]'))
        .waitFor({ state: 'visible', timeout: 1_500 })
        .then(() => true)
        .catch(() => false),
      dialog
        .waitFor({ state: 'hidden', timeout: 1_500 })
        .then(() => true)
        .catch(() => false),
    ]);

    if (!registered && (await confirmButton.isEnabled().catch(() => false))) {
      await confirmButton.click({ force: true });
    }
  }

  /** Dismisses whichever confirm-dialog is currently open (always the first button). */
  async cancelConfirmDialog(): Promise<void> {
    const dialog = this.confirmDialog;
    await dialog.waitFor({ state: 'visible' });
    await dialog.getByRole('button').first().click();
  }

  /**
   * These DX TextBoxes default to `valueChangeEvent: "change"` (docs/standards/e2e-testing.md
   * § Form popup), so `onValueChanged` — and therefore the RHF `field.onChange` that actually
   * updates `isValid` — only fires on blur, not per keystroke. `pressSequentially` alone can
   * leave the on-screen value filled while the underlying form state stays at its default;
   * `Tab` after typing guarantees the commit regardless of what the caller does next (a caller
   * that immediately moves to another field was getting this for free already, which is why
   * only the callers that submit right after filling a field ever surfaced it).
   */
  private async dxFill(input: Locator, value: string): Promise<void> {
    await input.press('Control+a');
    await input.pressSequentially(value);
    await input.press('Tab');
  }

  /** Fill first name field (DX TextBox — use pressSequentially). */
  async fillFirstName(value: string): Promise<void> {
    await this.dxFill(this.firstNameInput, value);
  }

  /** Fill last name field. */
  async fillLastName(value: string): Promise<void> {
    await this.dxFill(this.lastNameInput, value);
  }

  /** Fill email field. */
  async fillEmail(value: string): Promise<void> {
    await this.dxFill(this.emailInput, value);
  }

  /** Fill phone field. */
  async fillPhone(value: string): Promise<void> {
    await this.dxFill(this.phoneInput, value);
  }

  /** Select a role from the dropdown. */
  async selectRole(name: string): Promise<void> {
    await this.roleSelect.click();
    await this.page.locator('.dx-overlay-content .dx-list-item').filter({ hasText: name }).click();
  }

  /** Select a team inside the drawer form. */
  async selectFormTeam(name: string): Promise<void> {
    await this.teamSelect.click();
    await this.page.locator('.dx-overlay-content .dx-list-item').filter({ hasText: name }).click();
  }

  /** Fill the Athlete date-of-birth field. */
  async fillDateOfBirth(value: string): Promise<void> {
    await this.dateOfBirthInput.press('Control+a');
    await this.dateOfBirthInput.pressSequentially(value);
    await this.dateOfBirthInput.press('Enter');
    await this.dateOfBirthInput.press('Tab');
  }

  /**
   * Select the Athlete position. A DX SelectBox (`PlayingPosition` enum), not free
   * text — `user-athlete-details-section.tsx` renders it the same way user-role-section.tsx
   * renders roles, so it takes the same open-then-click-the-overlay-item shape.
   */
  async selectPosition(name: string): Promise<void> {
    await this.positionInput.click();
    await this.page.locator('.dx-overlay-content .dx-list-item').filter({ hasText: name }).click();
  }

  /** Fill the Athlete jersey number field. */
  async fillJerseyNumber(value: string): Promise<void> {
    await this.dxFill(this.jerseyNumberInput, value);
  }

  /** Fill the Athlete Parent/Guardian email field. */
  async fillParentGuardianEmail(value: string): Promise<void> {
    await this.dxFill(this.parentGuardianEmailInput, value);
  }

  /** Select one option from a DevExtreme TagBox (Team Assignment / Linked Athletes). */
  async selectTagBoxOption(tagBox: Locator, name: string): Promise<void> {
    await tagBox.click();
    // Exact match (not substring `hasText`) — avoids mis-selecting when another option's
    // text contains `name` as a substring.
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await this.page
      .locator('.dx-overlay-content .dx-list-item')
      .filter({ hasText: new RegExp(`^${escaped}$`) })
      .click();
    // Close the dropdown so it doesn't overlay subsequent fields. Deliberately NOT
    // `keyboard.press('Escape')`: the drawer's own useEscapeKey listener is attached to
    // `document` (not scoped/stopPropagation'd), so an Escape here also bubbles up and
    // triggers the drawer's "unsaved changes" discard prompt once the form is dirty,
    // blocking the subsequent submit. Known app-level bug — tracked separately
    //, worked around here by clicking the drawer heading instead.
    await this.drawer.getByRole('heading').first().click();
  }

  /** Select a team in the Team Assignment multi-select (Athlete/Coach). */
  async selectTeamAssignment(name: string): Promise<void> {
    await this.selectTagBoxOption(this.teamAssignmentSelect, name);
  }

  /** Select an athlete in the Linked Athlete(s) multi-select (Parent). */
  async selectLinkedAthlete(name: string): Promise<void> {
    await this.selectTagBoxOption(this.linkedAthletesSelect, name);
  }

  /** Submit the add-user form. */
  async submitForm(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Accepts the "Create user?" confirmation that stands between the drawer's submit and the
   * POST. Without it, `submitForm()` returns having only opened a dialog, so a spec waiting
   * on the POST response times out with the form apparently filled in correctly.
   *
   * @deprecated Every save/delete/suspend/activate/link flow in this drawer raises the same
   * `ConfirmDialog` — use {@link acceptConfirmDialog} directly. Kept as an alias for
   * readability at existing create-flow call sites.
   */
  async confirmCreate(): Promise<void> {
    await this.acceptConfirmDialog();
  }

  /** @deprecated alias for {@link acceptConfirmDialog} — kept for readability at link-flow call sites. */
  async confirmLink(): Promise<void> {
    await this.acceptConfirmDialog();
  }

  /** @deprecated alias for {@link cancelConfirmDialog}. */
  async cancelLink(): Promise<void> {
    await this.cancelConfirmDialog();
  }

  /** Toast notification (sonner — `notify()` in components/ui/toast.ts, not DX). */
  get toastMessage(): Locator {
    return this.page.locator('[data-sonner-toast]');
  }

  /**
   * Validation error message shown below a form field (`FieldError` — `role="alert"`).
   * `.first()` — identical messages (e.g. "invalid chars") can legitimately appear under
   * more than one field at once now that every `dxFill` blurs the field it just filled.
   */
  fieldError(text: string): Locator {
    return this.drawer.getByRole('alert').filter({ hasText: text }).first();
  }

  // ─── Change password ──────────────────────────────────────────────────────

  /**
   * Open the kebab (⋮) row menu for the grid row containing the given text and
   * click the "Change password" action. The menu is portalled to the body, so
   * the menuitem is queried at the page level.
   */
  async openChangePassword(rowText: string): Promise<void> {
    const row = this.dataRows.filter({ hasText: rowText });
    await row.getByRole('button', { name: /^actions for /i }).click();
    await this.page.getByRole('menuitem', { name: 'Change password' }).click();
    await this.changePasswordDialog.waitFor({ state: 'visible' });
  }

  /** Fill the new-password field (native input — fill is safe). */
  async fillNewPassword(value: string): Promise<void> {
    await this.newPasswordInput.fill(value);
  }

  /** Fill the confirm-password field. */
  async fillConfirmPassword(value: string): Promise<void> {
    await this.confirmPasswordInput.fill(value);
  }

  /** Submit the change-password form. */
  async submitChangePassword(): Promise<void> {
    await this.changePasswordSubmit.click();
  }

  /** The change-password drawer's actual dialog — reflects real open/closed state. */
  get changePasswordDialog(): Locator {
    return this.changePasswordDrawer.getByRole('dialog');
  }

  /**
   * A text node visible anywhere inside the change-password drawer. The description
   * paragraph and its bolded name span both contain the user's name as their own
   * normalised text, so a name-only lookup resolves to both — `.first()` disambiguates
   * without narrowing what other callers (e.g. validation messages) can match.
   */
  changePasswordText(text: string | RegExp): Locator {
    return this.changePasswordDrawer.getByText(text).first();
  }
}
