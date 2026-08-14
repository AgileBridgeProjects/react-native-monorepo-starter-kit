// Auth

// Utilities
export { appConfig } from './lib/app-config';
export type {
  AppMetadata,
  AuthActions,
  AuthState,
  AuthSubscriberCallbacks,
  AuthUser,
  HasAppMetadata,
  PhoneOtpTicket,
} from './lib/auth';
export {
  AccountNotFoundFailure,
  AuthFailure,
  accountDisplayIdentifier,
  authTransitionGuard,
  CUSTOM_AUTH_EMAIL_DOMAIN,
  customAuthUsername,
  EmailAlreadyInUseFailure,
  extractClubId,
  extractClubIdFromMetadata,
  extractClubSubdomain,
  extractClubSubdomainFromMetadata,
  InvalidCredentialsFailure,
  InvalidEmailFailure,
  InvalidPhoneNumberFailure,
  mapSupabaseError,
  OtpExpiredFailure,
  OtpInvalidFailure,
  OtpTooManyRequestsFailure,
  PASSWORD_COMPLEXITY,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
  ProviderConflictFailure,
  RecaptchaFailure,
  SETUP_TOKEN_EXPIRY_HOURS,
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
  SupabaseAuthDatasource,
  subscribeToAuth,
  TokenExpiredFailure,
  toUser,
  UserNotFoundFailure,
  WeakPasswordFailure,
} from './lib/auth';
export {
  CHECK_IN_SUMMARY_PERIODS,
  type CheckInSummaryPeriod,
  DEFAULT_CHECK_IN_SUMMARY_PERIOD,
  toCheckInSummaryPeriod,
} from './lib/check-in-summary-periods';
export { cn } from './lib/cn';
export {
  addDays,
  endOfDay,
  endOfMonth,
  isSameDay,
  parseLocalDate,
  startOfDay,
  startOfMonth,
  toDayKey,
} from './lib/date';
export { getErrorMessage } from './lib/error-message';
// HTTP
export { ApiError } from './lib/http/api-error';
export { createQueryClient } from './lib/http/query-client';
export {
  ADMIN_DATE_PICKER_FORMAT,
  adminDateOptions,
  adminTimeOptions,
  compactDateOptions,
  DEFAULT_LOCALE,
  formatCompactDate,
  formatSouthAfricanDate,
} from './lib/i18n';
export { JERSEY_NUMBER_MAX, JERSEY_NUMBER_MIN } from './lib/jersey-number';
export { MathUtil } from './lib/math';
export type { MediaType } from './lib/media-type';
export {
  ACCEPTED_ATTACHMENT_CONTENT_TYPES,
  displayFileName,
  fileExtension,
  IMAGE_EXTENSIONS,
  inferMediaType,
  isAcceptedAttachmentContentType,
  isFileBasedMedia,
  isImageUrl,
  MAX_AVATAR_SIZE_BYTES,
  MAX_MEDIA_SIZE_BYTES,
  MAX_MEDIA_SIZE_MB,
  MAX_ONBOARDING_PHOTO_SIZE_BYTES,
  MAX_ONBOARDING_PHOTO_SIZE_MB,
  MAX_VIDEO_SIZE_BYTES,
  MAX_VIDEO_SIZE_MB,
} from './lib/media-type';
export { getFullName, NAME_REGEX, splitName } from './lib/name';
export { toNumber, toNumberOrNull } from './lib/number-utils';
export { paging } from './lib/paging';
export {
  isValidPhone,
  isValidSAPhone,
  normalizeSALocal,
  SA_COUNTRY_CODE,
  SA_LOCAL_DIGIT_COUNT,
  SA_LOCAL_PHONE_REGEX,
  toInternational,
  toInternationalSA,
} from './lib/phone';
export type { PhoneCountry } from './lib/phone-countries';
export {
  countryCodeToEmoji,
  DEFAULT_PHONE_COUNTRY,
  getCountryName,
  getPhoneCountries,
} from './lib/phone-countries';
export { SMS_MAX_MESSAGE_LENGTH } from './lib/sms-limits';
// Supabase
export { createSupabaseClient } from './lib/supabase';
export { toTestId } from './lib/test-id';
export { globalUrlPattern, isUrl, URL_PATTERN } from './lib/text-patterns';
export type { CoverGradientId, CoverPatternId, CoverPatternTile } from './lib/tokens';
export {
  authControlHeight,
  avatarSize,
  borderRadius,
  COVER_PATTERN_TILES,
  coverGradient,
  coverGradientColors,
  coverPatternIds,
  cssGradients,
  DEFAULT_GRADIENT_IDS,
  fontFamily,
  fontSize,
  fontWeight,
  GRADIENT_PREFIX,
  generateBrandGradientColors,
  getBaseImageUrl,
  getGradientId,
  getGradientStyle,
  getPatternId,
  gradientImageUrl,
  gradients,
  iconSize,
  isGradientImage,
  lineHeight,
  PATTERN_SEPARATOR,
  palette,
  spacing,
  typeScale,
  withPattern,
  zIndex,
} from './lib/tokens';

// Types
export type { PuzzleChoice } from './types/puzzle-choice';
