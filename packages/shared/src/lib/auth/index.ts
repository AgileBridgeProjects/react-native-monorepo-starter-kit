export {
  accountDisplayIdentifier,
  CUSTOM_AUTH_EMAIL_DOMAIN,
  customAuthUsername,
  SETUP_TOKEN_EXPIRY_HOURS,
} from './auth-constants';
export type { AuthSubscriberCallbacks } from './auth-subscriber';
export { subscribeToAuth } from './auth-subscriber';
export { authTransitionGuard } from './auth-transition-guard';
export type { AppMetadata, HasAppMetadata } from './claims';
export {
  extractClubId,
  extractClubIdFromMetadata,
  extractClubSubdomain,
  extractClubSubdomainFromMetadata,
} from './claims';
export {
  AccountNotFoundFailure,
  AuthFailure,
  EmailAlreadyInUseFailure,
  InvalidCredentialsFailure,
  InvalidEmailFailure,
  InvalidPhoneNumberFailure,
  OtpExpiredFailure,
  OtpInvalidFailure,
  OtpTooManyRequestsFailure,
  ProviderConflictFailure,
  RecaptchaFailure,
  TokenExpiredFailure,
  UserNotFoundFailure,
  WeakPasswordFailure,
} from './failures';
export { PASSWORD_COMPLEXITY, PASSWORD_MIN_LENGTH, PASSWORD_RULES } from './password-rules';
export type { PhoneOtpTicket } from './supabase-auth.datasource';
export { mapSupabaseError, SupabaseAuthDatasource, toUser } from './supabase-auth.datasource';
export {
  SUPABASE_ERROR_BAD_JWT,
  SUPABASE_ERROR_EMAIL_EXISTS,
  SUPABASE_ERROR_IDENTITY_ALREADY_EXISTS,
  SUPABASE_ERROR_INVALID_CREDENTIALS,
  SUPABASE_ERROR_OTP_DISABLED,
  SUPABASE_ERROR_OTP_EXPIRED,
  SUPABASE_ERROR_OVER_REQUEST_RATE_LIMIT,
  SUPABASE_ERROR_OVER_SMS_SEND_RATE_LIMIT,
  SUPABASE_ERROR_PHONE_EXISTS,
  SUPABASE_ERROR_SESSION_EXPIRED,
  SUPABASE_ERROR_USER_ALREADY_EXISTS,
  SUPABASE_ERROR_VALIDATION_FAILED,
  SUPABASE_ERROR_WEAK_PASSWORD,
} from './supabase-error-codes';
export type { AuthActions, AuthState, AuthUser } from './types';
