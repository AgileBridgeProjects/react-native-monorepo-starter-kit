/**
 * Shared test IDs — single source of truth for E2E selectors.
 *
 * These MUST mirror the AUTH_TEST_IDS in:
 *   - apps/expo/src/features/auth/presentation/auth.copy.ts
 *   - apps/web/src/features/auth/presentation/auth.copy.ts
 *
 * If a testID changes in the app, update it here once and all tests follow.
 */
export const AUTH_TEST_IDS = {
  login: {
    emailInput: 'login-email-input',
    passwordInput: 'login-password-input',
    submitButton: 'login-submit-button',
    phoneLink: 'login-phone-link',
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

export const AUDIT_LOG_TEST_IDS = {
  page: 'audit-logs-page',
  detailDrawer: 'audit-log-drawer',
} as const;

export const CLUB_TEST_IDS = {
  page: 'clubs-page',
  addButton: 'clubs-add-button',
  accordion: 'clubs-accordion',
  addDrawer: 'add-club-drawer',
  editDrawer: 'edit-club-drawer',
} as const;

export const USERS_TEST_IDS = {
  page: 'users-page',
  addButton: 'users-add-button',
  drawer: 'add-user-drawer',
  deleteButton: 'users-delete-button',
  toggleActiveButton: 'users-toggle-active-button',
  bulkUploadDrawer: 'users-bulk-upload-drawer',
  bulkUploadConfirmButton: 'users-bulk-upload-confirm-button',
  changePasswordDrawer: 'change-password-drawer',
  changePasswordSubmit: 'change-password-submit',
} as const;

export const WORKSPACE_TEST_IDS = {
  clubSelector: 'club-selector',
  clubFlyout: 'club-flyout',
} as const;

export const ROLES_TEST_IDS = {
  page: 'roles-page',
  drawer: 'role-drawer',
  permissionsEditor: 'role-permissions-editor',
} as const;

export const REFLECTION_TEMPLATES_TEST_IDS = {
  page: 'reflection-templates-page',
  addButton: 'reflection-templates-add-button',
  grid: 'reflection-templates-grid',
  addDrawer: 'add-reflection-template-drawer',
  editDrawer: 'edit-reflection-template-drawer',
  submitButton: 'reflection-template-submit-button',
  questionForm: 'reflection-question-form',
} as const;
