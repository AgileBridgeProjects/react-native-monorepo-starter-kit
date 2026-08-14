/**
 * Supabase GoTrue auth error codes used by SupabaseAuthDatasource.
 *
 * These are the stable `error_code` string values returned by GoTrue on the
 * `AuthError.code` property (supabase-js >= 2.x). Centralised here so both apps
 * and any future tests can import from a single source.
 *
 * Reference: https://supabase.com/docs/reference/javascript/auth-error-codes
 */

/** Wrong email/password, or user does not exist. */
export const SUPABASE_ERROR_INVALID_CREDENTIALS = 'invalid_credentials';
/** Sign-up attempted with an email that is already registered. */
export const SUPABASE_ERROR_USER_ALREADY_EXISTS = 'user_already_exists';
/** Sign-up attempted with an email that is already registered (alternate code). */
export const SUPABASE_ERROR_EMAIL_EXISTS = 'email_exists';
/** Phone number already registered. */
export const SUPABASE_ERROR_PHONE_EXISTS = 'phone_exists';
/** Password does not meet the configured strength requirements. */
export const SUPABASE_ERROR_WEAK_PASSWORD = 'weak_password';
/** Email address is malformed. */
export const SUPABASE_ERROR_VALIDATION_FAILED = 'validation_failed';
/** Bad email/phone format on OTP or sign-up. */
export const SUPABASE_ERROR_BAD_JWT = 'bad_jwt';
/** JWT / session expired. */
export const SUPABASE_ERROR_SESSION_EXPIRED = 'session_expired';
/** Supplied OTP token was wrong or has already expired. */
export const SUPABASE_ERROR_OTP_EXPIRED = 'otp_expired';
/** OTP could not be disabled/verified — generic OTP failure. */
export const SUPABASE_ERROR_OTP_DISABLED = 'otp_disabled';
/** Too many requests — rate limited. */
export const SUPABASE_ERROR_OVER_REQUEST_RATE_LIMIT = 'over_request_rate_limit';
/** Too many SMS/OTP sends — rate limited. */
export const SUPABASE_ERROR_OVER_SMS_SEND_RATE_LIMIT = 'over_sms_send_rate_limit';
/** Identity is already linked to another user. */
export const SUPABASE_ERROR_IDENTITY_ALREADY_EXISTS = 'identity_already_exists';
