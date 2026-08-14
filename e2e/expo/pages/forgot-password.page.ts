import type { Locator, Page } from '@playwright/test';
import { AUTH_TEST_IDS } from '../selectors';

/**
 * Page Object for the forgot-password screen (`/(auth)/forgot-password`).
 *
 * The screen always shows the success card on settle (OWASP — never reveal
 * whether an email exists). Custom-auth domains are rejected client-side with
 * the `emailNotEligible` validation message before any request fires.
 */
export class ForgotPasswordPage {
  readonly backButton: Locator;
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly successCard: Locator;

  constructor(private readonly page: Page) {
    const ids = AUTH_TEST_IDS.forgotPassword;
    this.backButton = page.getByTestId(ids.backButton);
    this.emailInput = page.getByTestId(ids.emailInput);
    this.submitButton = page.getByTestId(ids.submitButton);
    this.successCard = page.getByTestId(ids.successCard);
  }

  async goto() {
    await this.page.goto('/(auth)/forgot-password');
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async submit() {
    await this.submitButton.click();
  }

  async fillAndSubmit(email: string) {
    await this.fillEmail(email);
    await this.submit();
  }

  async goBack() {
    await this.backButton.click();
  }
}
