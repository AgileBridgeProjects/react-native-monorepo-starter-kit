/**
 * Auth domain failures.
 *
 * These are business-rule violations — not technical errors.
 * Each failure carries a `localeKey` that maps to a key in the `errors` i18n
 * namespace, plus optional `localeParams` for interpolation. The presentation
 * layer resolves these via `getErrorMessage()` + i18next.
 *
 * The `message` property is a developer-facing fallback (English) for logging;
 * it is never shown to users.
 */

export class AuthFailure extends Error {
  readonly localeKey: string;
  readonly localeParams?: Record<string, string>;

  constructor(message: string, localeKey: string, localeParams?: Record<string, string>) {
    super(message);
    this.name = 'AuthFailure';
    this.localeKey = localeKey;
    this.localeParams = localeParams;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidCredentialsFailure extends AuthFailure {
  constructor() {
    super('Invalid email or password.', 'auth.invalidCredentials');
    this.name = 'InvalidCredentialsFailure';
  }
}

export class InvalidEmailFailure extends AuthFailure {
  constructor(email: string) {
    super(`"${email}" is not a valid email address.`, 'auth.invalidEmail', { email });
    this.name = 'InvalidEmailFailure';
  }
}

export class TokenExpiredFailure extends AuthFailure {
  constructor() {
    super('Session expired.', 'auth.tokenExpired');
    this.name = 'TokenExpiredFailure';
  }
}

export class UserNotFoundFailure extends AuthFailure {
  constructor() {
    super('User not found.', 'auth.userNotFound');
    this.name = 'UserNotFoundFailure';
  }
}

export class EmailAlreadyInUseFailure extends AuthFailure {
  constructor(email: string) {
    super(`${email} is already registered.`, 'auth.emailAlreadyInUse', { email });
    this.name = 'EmailAlreadyInUseFailure';
  }
}

export class WeakPasswordFailure extends AuthFailure {
  constructor() {
    super('Password is too weak.', 'auth.weakPassword');
    this.name = 'WeakPasswordFailure';
  }
}

export class InvalidPhoneNumberFailure extends AuthFailure {
  constructor() {
    super('Invalid phone number.', 'auth.invalidPhoneNumber');
    this.name = 'InvalidPhoneNumberFailure';
  }
}

export class OtpInvalidFailure extends AuthFailure {
  constructor() {
    super('Invalid OTP code. Please try again.', 'auth.otpInvalid');
    this.name = 'OtpInvalidFailure';
  }
}

export class OtpExpiredFailure extends AuthFailure {
  constructor() {
    super('OTP has expired. Please request a new one.', 'auth.otpExpired');
    this.name = 'OtpExpiredFailure';
  }
}

export class OtpTooManyRequestsFailure extends AuthFailure {
  constructor() {
    super('Too many requests. Please try again later.', 'auth.otpTooManyRequests');
    this.name = 'OtpTooManyRequestsFailure';
  }
}

export class RecaptchaFailure extends AuthFailure {
  constructor() {
    super('reCAPTCHA verification failed.', 'auth.recaptchaFailed');
    this.name = 'RecaptchaFailure';
  }
}

/**
 * Sign-in with the identity provider succeeded, but no StarterKit account is linked
 * to the credentials (or it is not assigned to any club). Surfaced on the
 * login screen instead of silently dropping the user on Home.
 */
export class AccountNotFoundFailure extends AuthFailure {
  constructor() {
    super('No StarterKit account found for these credentials.', 'auth.accountNotFound');
    this.name = 'AccountNotFoundFailure';
  }
}

export class ProviderConflictFailure extends AuthFailure {
  readonly existingProvider: string;
  /** True when the Firebase account exists but has zero linked providers (orphaned account). */
  readonly noLinkedProvider: boolean;

  constructor(email: string, existingProvider: string, noLinkedProvider = false) {
    const knownEmail = email && email !== 'unknown' ? email : null;
    super(
      noLinkedProvider
        ? `${knownEmail ?? 'This account'} has no sign-in method configured. Please contact your administrator.`
        : knownEmail
          ? `${knownEmail} is already linked to ${existingProvider}.`
          : `This account is already linked to ${existingProvider}.`,
      'auth.providerConflict',
      { email, provider: existingProvider },
    );
    this.name = 'ProviderConflictFailure';
    this.existingProvider = existingProvider;
    this.noLinkedProvider = noLinkedProvider;
  }
}
