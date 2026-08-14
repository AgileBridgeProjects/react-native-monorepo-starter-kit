import type { Locator, Page } from '@playwright/test';
import { AUTH_TEST_IDS } from '../selectors';

/**
 * Page Object for the Login page.
 * Encapsulates all selectors and common actions — tests stay DRY.
 */
export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(private readonly page: Page) {
    const ids = AUTH_TEST_IDS.login;
    this.emailInput = page.getByTestId(ids.emailInput);
    this.passwordInput = page.getByTestId(ids.passwordInput);
    this.submitButton = page.getByTestId(ids.submitButton);
  }

  async goto() {
    await this.page.goto('/login');
  }

  async fillForm(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.submitButton.click();
  }

  async fillAndSubmit(email: string, password: string) {
    await this.fillForm(email, password);
    await this.submit();
  }
}
