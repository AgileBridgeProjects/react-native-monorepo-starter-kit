import type { Locator, Page } from '@playwright/test';
import { AUTH_TEST_IDS } from '../selectors';

/**
 * Page Object for the Expo-web login screen (`/(auth)/login`).
 *
 * Email/password only — that is all the screen ships. The social buttons, phone mode, the
 * OAuth overlay and the provider-conflict sheet live behind
 * EXPO_PUBLIC_SOCIAL_AUTH_ENABLED, which no environment sets, so this POM deliberately
 * exposes no locators for them: a POM that can reach unreachable UI invites specs that pass
 * only because a test environment turned the flag on. Add them back with the feature.
 *
 * The same POM serves both the wide-web split-panel (≥768px) and the stacked mobile layout,
 * because the testIDs are layout-independent (see docs/e2e/phase2-user-flows.md §1).
 */
export class LoginPage {
  // ── Email mode ──────────────────────────────────────────────────────────
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly forgotPasswordLink: Locator;

  // ── Layout containers (for "which layout rendered" assertions) ─────────────
  readonly screenLayout: Locator;
  readonly gradientHero: Locator;

  constructor(private readonly page: Page) {
    const ids = AUTH_TEST_IDS;
    this.emailInput = page.getByTestId(ids.login.emailInput);
    this.passwordInput = page.getByTestId(ids.login.passwordInput);
    this.submitButton = page.getByTestId(ids.login.submitButton);
    // The "Forgot password?" link has no testID — it is a link role. Locale copy
    // (auth.json) reads "Forgot password?", not "Forgot your password?".
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot password/i });

    this.screenLayout = page.getByTestId(ids.components.screenLayout);
    this.gradientHero = page.getByTestId(ids.components.gradientHero);
  }

  async goto() {
    await this.page.goto('/(auth)/login');
  }

  /** Navigate to login with the reset-success banner query param set. */
  async gotoResetSuccess() {
    await this.page.goto('/(auth)/login?resetSuccess=1');
  }

  // ── Email-mode actions ─────────────────────────────────────────────────────

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

  async openForgotPassword() {
    await this.forgotPasswordLink.click();
  }
}
