export const AUTH_TEST_IDS = {
  login: {
    emailInput: 'login-email-input',
    passwordInput: 'login-password-input',
    submitButton: 'login-submit-button',
    googleButton: 'login-google-button',
    appleButton: 'login-apple-button',
    microsoftButton: 'login-microsoft-button',
    phoneLink: 'login-phone-link',
    forgotPasswordLink: 'login-forgot-password-link',
  },
  phoneLogin: {
    phoneInput: 'phone-login-phone-input',
    submitButton: 'phone-login-submit-button',
  },
  otpVerify: {
    codeInput: 'otp-verify-code-input',
    submitButton: 'otp-verify-submit-button',
    backButton: 'otp-verify-back-button',
    resendButton: 'otp-verify-resend-button',
  },
} as const;

export const SESSION_TEST_IDS = {
  warningModal: 'session-warning-modal',
  countdown: 'session-warning-countdown',
  extendButton: 'session-extend-button',
  signOutButton: 'session-sign-out-button',
  expiryBanner: 'session-expiry-banner',
} as const;

export const VALID_SESSION_REASONS = ['idle', 'absolute'] as const;
export type SessionExpiredReason = (typeof VALID_SESSION_REASONS)[number];
