import type { Locator, Page } from '@playwright/test';
import { AUTH_TEST_IDS } from '../selectors';

/**
 * Page Object for the account-setup / reset-via-link screen
 * (`/(auth)/setup-account?token=&purpose=`).
 *
 * Three mount states, selected by token + validation result:
 *  - no `token` query param            → `invalidLink`
 *  - validating the token (in-flight)  → `validating`
 *  - token rejected by the API         → `tokenInvalid`
 *  - token valid                        → the password form (inputs + submit)
 *
 * On success: `purpose=reset` → `/login?resetSuccess=1`; otherwise → `/login`.
 */
export class SetupAccountPage {
  // State views
  readonly invalidLink: Locator;
  readonly validating: Locator;
  readonly tokenInvalid: Locator;

  // Form
  readonly backButton: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;

  constructor(private readonly page: Page) {
    const ids = AUTH_TEST_IDS.setup;
    this.invalidLink = page.getByTestId(ids.invalidLink);
    this.validating = page.getByTestId(ids.validating);
    this.tokenInvalid = page.getByTestId(ids.tokenInvalid);
    this.backButton = page.getByTestId(ids.backButton);
    this.passwordInput = page.getByTestId(ids.passwordInput);
    this.confirmPasswordInput = page.getByTestId(ids.confirmPasswordInput);
    this.submitButton = page.getByTestId(ids.submitButton);
  }

  /**
   * Navigate to the setup screen.
   * @param token   the setup/reset token (omit to hit the `invalidLink` state)
   * @param purpose `reset` for a password reset, otherwise account setup
   */
  async goto(token?: string, purpose?: 'reset') {
    const params = new URLSearchParams();
    if (token !== undefined) params.set('token', token);
    if (purpose) params.set('purpose', purpose);
    const query = params.toString();
    await this.page.goto(`/(auth)/setup-account${query ? `?${query}` : ''}`);
  }

  passwordRuleRow(key: string): Locator {
    return this.page.getByTestId(AUTH_TEST_IDS.components.passwordRules.rule(key));
  }

  async fillPasswords(password: string, confirmPassword = password) {
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword);
  }

  async submit() {
    await this.submitButton.click();
  }

  async fillAndSubmit(password: string, confirmPassword = password) {
    await this.fillPasswords(password, confirmPassword);
    await this.submit();
  }

  async goBack() {
    await this.backButton.click();
  }
}
