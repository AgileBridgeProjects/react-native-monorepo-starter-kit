import type { Locator, Page } from '@playwright/test';
import { AUTH_TEST_IDS } from '../selectors';

/**
 * Page Object for the Phone Login page (/login/phone).
 * Encapsulates all selectors and common actions — tests stay DRY.
 */
export class PhoneLoginPage {
  readonly phoneInput: Locator;
  readonly submitButton: Locator;
  readonly backToEmailLink: Locator;

  constructor(private readonly page: Page) {
    const ids = AUTH_TEST_IDS.phoneLogin;
    this.phoneInput = page.getByTestId(ids.phoneInput);
    this.submitButton = page.getByTestId(ids.submitButton);
    this.backToEmailLink = page.getByRole('link', { name: /back to email/i });
  }

  async goto() {
    await this.page.goto('/login/phone');
  }

  async fillPhone(phone: string) {
    await this.phoneInput.fill(phone);
  }

  async submit() {
    await this.submitButton.click();
  }

  async fillAndSubmit(phone: string) {
    await this.fillPhone(phone);
    await this.submit();
  }
}
