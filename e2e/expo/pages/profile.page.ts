import type { Locator, Page } from '@playwright/test';
import {
  AUTH_TEST_IDS,
  EDIT_PROFILE_TEST_IDS,
  HELP_TEST_IDS,
  PROFILE_TEST_IDS,
  SETTINGS_TEST_IDS,
} from '../selectors';

/**
 * Profile screen POM (`/profile`).
 *
 * Navigation to Edit-profile / Settings / Help is performed via the real menu-row
 * testIDs (`editProfileMenuItem` etc.) — NOT the legacy `profile-name-field` ghost,
 * which is declared in the copy registry but never rendered.
 *
 * Sign-out has two paths: on mobile + global the in-screen `logoutButton` is shown;
 * on web-tablet it is hidden (the sidebar owns it). Branch on `page.viewportSize()`.
 */
export class ProfilePage {
  readonly screen: Locator;
  readonly displayName: Locator;
  readonly email: Locator;
  readonly avatarButton: Locator;
  readonly logoutButton: Locator;
  readonly editProfileMenuItem: Locator;
  readonly settingsMenuItem: Locator;
  readonly helpMenuItem: Locator;
  readonly switchOrgMenuItem: Locator;

  constructor(private readonly page: Page) {
    this.screen = page.getByTestId(PROFILE_TEST_IDS.screen);
    this.displayName = page.getByTestId(PROFILE_TEST_IDS.displayName);
    this.email = page.getByTestId(PROFILE_TEST_IDS.email);
    this.avatarButton = page.getByTestId(PROFILE_TEST_IDS.avatarButton);
    this.logoutButton = page.getByTestId(PROFILE_TEST_IDS.logoutButton);
    this.editProfileMenuItem = page.getByTestId(PROFILE_TEST_IDS.editProfileMenuItem);
    this.settingsMenuItem = page.getByTestId(PROFILE_TEST_IDS.settingsMenuItem);
    this.helpMenuItem = page.getByTestId(PROFILE_TEST_IDS.helpMenuItem);
    this.switchOrgMenuItem = page.getByTestId(AUTH_TEST_IDS.drawer.switchOrg);
  }

  async goto() {
    await this.page.goto('/profile');
  }

  async waitForScreen() {
    await this.screen.waitFor({ state: 'visible' });
  }

  /** Open the Edit-profile screen via the real menu row (not the ghost name field). */
  async openEditProfile() {
    await this.editProfileMenuItem.click();
  }

  async openSettings() {
    await this.settingsMenuItem.click();
  }

  async openHelp() {
    await this.helpMenuItem.click();
  }

  async signOut() {
    await this.logoutButton.click();
  }

  /** The hidden web `<input type="file">` rendered by the avatar Pressable on web. */
  fileInput(): Locator {
    return this.page.locator('input[type="file"]');
  }
}

/**
 * Edit-profile screen POM (`/edit-profile`).
 *
 * The display-name `Input` renders as a web `<input>`; `fillDisplayName` fires real
 * input events so react state + the save-disabled-until-changed guard update.
 * Change-password section is rendered ONLY for password-based accounts
 * (Credentials / CustomAuthentication) — its submit button comes from the AUTH registry.
 */
export class EditProfilePage {
  readonly screen: Locator;
  readonly displayNameInput: Locator;
  readonly avatarButton: Locator;
  readonly saveButton: Locator;
  readonly changePasswordSubmit: Locator;

  constructor(private readonly page: Page) {
    this.screen = page.getByTestId(EDIT_PROFILE_TEST_IDS.screen);
    this.displayNameInput = page.getByTestId(EDIT_PROFILE_TEST_IDS.displayNameInput);
    this.avatarButton = page.getByTestId(EDIT_PROFILE_TEST_IDS.avatarButton);
    this.saveButton = page.getByTestId(EDIT_PROFILE_TEST_IDS.saveButton);
    this.changePasswordSubmit = page.getByTestId(
      AUTH_TEST_IDS.components.changePassword.submitButton,
    );
  }

  async goto() {
    await this.page.goto('/edit-profile');
  }

  async waitForScreen() {
    await this.screen.waitFor({ state: 'visible' });
  }

  async fillDisplayName(displayName: string) {
    await this.displayNameInput.fill(displayName);
  }

  async save() {
    await this.saveButton.click();
  }

  /** The hidden web `<input type="file">` rendered by the avatar Pressable on web. */
  fileInput(): Locator {
    return this.page.locator('input[type="file"]');
  }
}

/**
 * Settings screen POM (`/settings`).
 *
 * All toggles are react-native-web `Switch` elements (rendered as a checkbox-role
 * input carrying the testID).
 */
export class SettingsPage {
  readonly screen: Locator;
  readonly notificationsSwitch: Locator;
  readonly darkModeSwitch: Locator;
  readonly reduceMotionSwitch: Locator;

  constructor(private readonly page: Page) {
    this.screen = page.getByTestId(SETTINGS_TEST_IDS.screen);
    // react-native-web's <Switch> places the testID on an outer <div>; the real
    // toggle is the inner <input type="checkbox" role="switch">. Target that inner
    // input so Playwright's toBeChecked()/click() operate on the actual control.
    this.notificationsSwitch = page
      .getByTestId(SETTINGS_TEST_IDS.notificationsSwitch)
      .locator('input');
    this.darkModeSwitch = page.getByTestId(SETTINGS_TEST_IDS.darkModeSwitch).locator('input');
    this.reduceMotionSwitch = page
      .getByTestId(SETTINGS_TEST_IDS.reduceMotionSwitch)
      .locator('input');
  }

  async goto() {
    await this.page.goto('/settings');
  }

  async waitForScreen() {
    await this.screen.waitFor({ state: 'visible' });
  }

  async toggleNotifications() {
    await this.notificationsSwitch.click();
  }

  async toggleDarkMode() {
    await this.darkModeSwitch.click();
  }

  async toggleReduceMotion() {
    await this.reduceMotionSwitch.click();
  }
}

/**
 * Help / contact-support screen POM (`/help`).
 *
 * Body uses a raw multiline `TextInput`; subject uses the shared `Input`. On success
 * the form unmounts and the `successView` + `doneButton` render in its place.
 */
export class HelpPage {
  readonly screen: Locator;
  readonly subjectInput: Locator;
  readonly bodyInput: Locator;
  readonly sendButton: Locator;
  readonly successView: Locator;
  readonly doneButton: Locator;

  constructor(private readonly page: Page) {
    this.screen = page.getByTestId(HELP_TEST_IDS.screen);
    this.subjectInput = page.getByTestId(HELP_TEST_IDS.subjectInput);
    this.bodyInput = page.getByTestId(HELP_TEST_IDS.bodyInput);
    this.sendButton = page.getByTestId(HELP_TEST_IDS.sendButton);
    this.successView = page.getByTestId(HELP_TEST_IDS.successView);
    this.doneButton = page.getByTestId(HELP_TEST_IDS.doneButton);
  }

  async goto() {
    await this.page.goto('/help');
  }

  async waitForScreen() {
    await this.screen.waitFor({ state: 'visible' });
  }

  async fillForm(subject: string, body: string) {
    await this.subjectInput.fill(subject);
    await this.bodyInput.fill(body);
  }

  async send() {
    await this.sendButton.click();
  }

  async done() {
    await this.doneButton.click();
  }
}
