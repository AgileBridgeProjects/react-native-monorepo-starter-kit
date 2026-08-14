export const AUTH_TEST_IDS = {
  login: {
    emailInput: 'login-email-input',
    passwordInput: 'login-password-input',
    submitButton: 'login-submit-button',
    googleButton: 'login-google-button',
    appleButton: 'login-apple-button',
    microsoftButton: 'login-microsoft-button',
    phoneButton: 'login-phone-button',
    forgotPassword: 'login-forgot-password',
  },
  phoneLogin: {
    phoneInput: 'phone-login-phone-input',
    submitButton: 'phone-login-submit-button',
  },
  forgotPassword: {
    backButton: 'forgot-password-back-button',
    emailInput: 'forgot-password-email-input',
    submitButton: 'forgot-password-submit-button',
    successCard: 'forgot-password-success-card',
  },
  setup: {
    invalidLink: 'setup-invalid-link',
    validating: 'setup-validating',
    tokenInvalid: 'setup-token-invalid',
    backButton: 'setup-back-button',
    submitButton: 'setup-submit-button',
    passwordInput: 'setup-password-input',
    confirmPasswordInput: 'setup-confirm-password-input',
  },
  otpVerify: {
    codeInput: 'otp-verify-code-input',
    submitButton: 'otp-verify-submit-button',
    backButton: 'otp-verify-back-button',
  },
  selectOrg: {
    screen: 'select-org-screen',
    orgItem: (clubId: string) => `select-org-item-${clubId}`,
  },
  drawer: {
    switchOrg: 'drawer-switch-org',
  },
  components: {
    gradientHero: 'auth-gradient-hero',
    screenLayout: 'auth-screen-layout',
    formCard: 'auth-form-card',
    waveDivider: 'auth-wave-divider',
    selectOrgHeader: 'select-org-header',
    oauthOverlay: {
      root: 'oauth-loading-overlay',
      slowMessage: 'oauth-loading-overlay-slow',
      cancelButton: 'oauth-loading-overlay-cancel',
    },
    providerConflict: {
      sheet: 'provider-conflict-sheet',
      dismissButton: 'provider-conflict-dismiss',
    },
    changePassword: {
      submitButton: 'change-password-submit',
    },
    passwordRules: {
      rule: (key: string) => `password-rule-${key}`,
    },
  },
} as const;
