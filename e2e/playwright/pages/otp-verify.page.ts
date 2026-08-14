import type { Locator, Page } from '@playwright/test';
import { AUTH_TEST_IDS } from '../selectors';

/**
 * Page Object for the OTP Verify page (/login/otp-verify).
 * Encapsulates all selectors and common actions — tests stay DRY.
 */
export class OtpVerifyPage {
  readonly codeInput: Locator;
  readonly submitButton: Locator;
  readonly backButton: Locator;
  readonly resendButton: Locator;

  constructor(private readonly page: Page) {
    const ids = AUTH_TEST_IDS.otpVerify;
    this.codeInput = page.getByTestId(ids.codeInput);
    this.submitButton = page.getByTestId(ids.submitButton);
    this.backButton = page.getByTestId(ids.backButton);
    this.resendButton = page.getByTestId(ids.resendButton);
  }

  async goto(phone = '') {
    await this.page.goto(`/login/otp-verify${phone ? `?phone=${encodeURIComponent(phone)}` : ''}`);
  }

  async fillCode(code: string) {
    await this.codeInput.fill(code);
  }

  async submit() {
    await this.submitButton.click();
  }

  async fillAndSubmit(code: string) {
    await this.fillCode(code);
    await this.submit();
  }
}
