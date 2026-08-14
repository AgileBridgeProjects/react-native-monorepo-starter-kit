import type { AuthError, Session, SupabaseClient, User } from '@supabase/supabase-js';

import { authTransitionGuard } from './auth-transition-guard';
import { extractClubIdFromMetadata } from './claims';
import {
  type AuthFailure,
  EmailAlreadyInUseFailure,
  InvalidCredentialsFailure,
  InvalidEmailFailure,
  InvalidPhoneNumberFailure,
  OtpExpiredFailure,
  OtpInvalidFailure,
  OtpTooManyRequestsFailure,
  ProviderConflictFailure,
  TokenExpiredFailure,
  WeakPasswordFailure,
} from './failures';
import {
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
import type { AuthUser } from './types';

// ─── Public types ───────────────────────────────────────────────────────────

/**
 * Provider-neutral handle returned by `sendPhoneOtp`.
 *
 * GoTrue phone OTP is stateless — unlike Firebase's `ConfirmationResult`, there
 * is no server-side object to hold. We just need the phone number to pass back
 * into `verifyOtp`. This shape keeps the datasource free of any Firebase type so
 * callers can stash it for the confirm step exactly as before.
 */
export interface PhoneOtpTicket {
  phoneNumber: string;
}

// ─── Datasource ───────────────────────────────────────────────────────────────

/**
 * Shared self-hosted-Supabase (GoTrue) auth datasource — framework-agnostic,
 * pure supabase-js calls.
 *
 * Accepts the app's `SupabaseClient` as a constructor argument so that each app
 * (Expo with AsyncStorage persistence, web with browser `localStorage`) can
 * create its own client with platform-specific persistence and pass it in. This
 * keeps `packages/shared` free of platform-specific setup code, mirroring how
 * the old `FirebaseAuthDatasource` accepted an `Auth` instance.
 *
 * The public method surface and return shapes are identical to the previous
 * `FirebaseAuthDatasource`, so app hooks/stores need no changes.
 */
export class SupabaseAuthDatasource {
  constructor(private readonly supabase: SupabaseClient) {}

  async login(email: string, password: string): Promise<{ user: AuthUser; idToken: string }> {
    authTransitionGuard.inProgress = true;
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) {
      authTransitionGuard.inProgress = false;
      throw mapSupabaseError(error);
    }
    return this.toResult(data.session, data.user);
  }

  async register(
    email: string,
    password: string,
    name: string,
  ): Promise<{ user: AuthUser; idToken: string }> {
    // Display name goes into user_metadata via options.data (a GoTrue convention).
    // club_id is NOT set here — it lives in app_metadata, populated server-side.
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { name, display_name: name } },
    });
    if (error) throw mapSupabaseError(error);
    return this.toResult(data.session, data.user, name);
  }

  /**
   * Sign in with a Google-issued OIDC ID token.
   *
   * Requires the Google provider to be enabled in the GoTrue configuration
   * (self-hosted: `GOTRUE_EXTERNAL_GOOGLE_ENABLED=true` + client id/secret).
   * The second `accessToken` argument is accepted for API compatibility with the
   * old Firebase signature but is not needed by GoTrue's ID-token flow.
   */
  async signInWithGoogle(
    idToken: string,
    _accessToken?: string,
  ): Promise<{ user: AuthUser; idToken: string }> {
    authTransitionGuard.inProgress = true;
    const { data, error } = await this.supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) {
      authTransitionGuard.inProgress = false;
      // GoTrue surfaces "identity already linked to another account" style
      // conflicts distinctly — map them to the same failure the UI already handles.
      if (error.code === SUPABASE_ERROR_IDENTITY_ALREADY_EXISTS) {
        const email = extractEmailFromJwt(idToken) ?? 'unknown';
        throw new ProviderConflictFailure(email, 'another provider');
      }
      throw mapSupabaseError(error);
    }
    return this.toResult(data.session, data.user);
  }

  /**
   * Sign in with an Apple-issued OIDC identity token.
   *
   * Requires the Apple provider to be enabled in the GoTrue configuration
   * (self-hosted: `GOTRUE_EXTERNAL_APPLE_ENABLED=true` + client id/secret).
   *
   * Pass the RAW nonce here (the same value whose SHA256 hash was handed to
   * Apple's `signInAsync`). GoTrue hashes it internally and compares against the
   * `nonce` claim Apple embedded in the identity token, closing the replay-attack
   * gap. Mirrors the shape/return of `signInWithGoogle`.
   */
  async signInWithApple(
    identityToken: string,
    rawNonce?: string,
  ): Promise<{ user: AuthUser; idToken: string }> {
    authTransitionGuard.inProgress = true;
    const { data, error } = await this.supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: identityToken,
      nonce: rawNonce,
    });
    if (error) {
      authTransitionGuard.inProgress = false;
      // GoTrue surfaces "identity already linked to another account" style
      // conflicts distinctly — map them to the same failure the UI already handles.
      if (error.code === SUPABASE_ERROR_IDENTITY_ALREADY_EXISTS) {
        const email = extractEmailFromJwt(identityToken) ?? 'unknown';
        throw new ProviderConflictFailure(email, 'another provider');
      }
      throw mapSupabaseError(error);
    }
    return this.toResult(data.session, data.user);
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
  }

  /**
   * Returns the current access token (the GoTrue JWT sent to the .NET APIs as
   * `Authorization: Bearer <token>`). When `forceRefresh` is set, the session is
   * refreshed first so a fresh token is returned.
   */
  async getIdToken(forceRefresh = false): Promise<string | null> {
    if (forceRefresh) {
      const { data, error } = await this.supabase.auth.refreshSession();
      if (error) throw mapSupabaseError(error);
      return data.session?.access_token ?? null;
    }
    const { data } = await this.supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  /**
   * Returns the current GoTrue user, or `null` when signed out.
   *
   * Synchronous like the old `getCurrentUser()`. Reads from the in-memory
   * session so it does not hit the network; callers that need a guaranteed-fresh
   * user should await `supabase.auth.getUser()` directly.
   */
  getCurrentUser(): User | null {
    // getSession() is async in supabase-js, but the client keeps the last known
    // session in memory. We expose the cached user for parity with the old
    // synchronous `auth.currentUser`. Returns null until the session hydrates.
    // biome-ignore lint/suspicious/noExplicitAny: reading the internal in-memory session for a sync accessor
    const cached = (this.supabase.auth as any).currentSession as Session | null | undefined;
    return cached?.user ?? null;
  }

  /**
   * Send a phone OTP via SMS.
   *
   * Requires an SMS provider to be configured in GoTrue
   * (self-hosted: `GOTRUE_SMS_*`). Returns a provider-neutral ticket carrying the
   * phone number for the confirm step.
   */
  async sendPhoneOtp(phoneNumber: string): Promise<PhoneOtpTicket> {
    const { error } = await this.supabase.auth.signInWithOtp({ phone: phoneNumber });
    if (error) throw mapSupabaseError(error);
    return { phoneNumber };
  }

  /** Verify a phone OTP code against the ticket returned by `sendPhoneOtp`. */
  async confirmPhoneOtp(
    ticket: PhoneOtpTicket,
    otp: string,
  ): Promise<{ user: AuthUser; idToken: string }> {
    authTransitionGuard.inProgress = true;
    const { data, error } = await this.supabase.auth.verifyOtp({
      phone: ticket.phoneNumber,
      token: otp,
      type: 'sms',
    });
    if (error) {
      authTransitionGuard.inProgress = false;
      throw mapSupabaseError(error);
    }
    return this.toResult(data.session, data.user);
  }

  // ─── Internal ────────────────────────────────────────────────────────────

  private toResult(
    session: Session | null,
    user: User | null,
    displayName?: string,
  ): { user: AuthUser; idToken: string } {
    if (!session || !user) {
      // A null session after a successful call means email confirmation is
      // pending (GoTrue "confirm email" flow). Surface it as a token-expired-ish
      // failure so the UI does not proceed with an unauthenticated session.
      throw new TokenExpiredFailure();
    }
    return {
      user: toUser(user, displayName),
      idToken: session.access_token,
    };
  }
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

/** Maps a GoTrue `User` to the shared `AuthUser` domain shape. */
export function toUser(user: User, displayName?: string): AuthUser {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const metaName =
    (typeof metadata.name === 'string' && metadata.name) ||
    (typeof metadata.display_name === 'string' && metadata.display_name) ||
    (typeof metadata.full_name === 'string' && metadata.full_name) ||
    '';
  const avatarUrl = typeof metadata.avatar_url === 'string' ? metadata.avatar_url : undefined;

  return {
    id: user.id,
    email: user.email ?? '',
    name: displayName ?? metaName,
    avatarUrl,
    // club_id is a server-set claim in app_metadata; may be absent until the
    // backend links the user. Handled gracefully (undefined).
    clubId: extractClubIdFromMetadata(user.app_metadata),
  };
}

// ─── Error mapping ────────────────────────────────────────────────────────────

function isAuthError(error: unknown): error is AuthError {
  return (
    error instanceof Error && ('code' in error || 'status' in error) && error.name.includes('Auth')
  );
}

/** Decode the email claim from a JWT ID token (Google, etc.). */
function extractEmailFromJwt(jwt: string): string | null {
  try {
    const payload = jwt.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const jsonStr = (globalThis as unknown as { atob: (s: string) => string }).atob(padded);
    const decoded = JSON.parse(jsonStr) as Record<string, unknown>;
    return typeof decoded.email === 'string' ? decoded.email : null;
  } catch {
    return null;
  }
}

/**
 * Declarative GoTrue error-code → AuthFailure map.
 *
 * To handle a new GoTrue error code: add a single entry here. Mirrors the shape
 * of the old Firebase error map.
 */
type SupabaseErrorFactory = (error: AuthError) => AuthFailure;

const SUPABASE_ERROR_MAP: Readonly<Record<string, SupabaseErrorFactory>> = {
  [SUPABASE_ERROR_INVALID_CREDENTIALS]: () => new InvalidCredentialsFailure(),
  [SUPABASE_ERROR_USER_ALREADY_EXISTS]: () => new EmailAlreadyInUseFailure('unknown'),
  [SUPABASE_ERROR_EMAIL_EXISTS]: () => new EmailAlreadyInUseFailure('unknown'),
  [SUPABASE_ERROR_PHONE_EXISTS]: () => new InvalidPhoneNumberFailure(),
  [SUPABASE_ERROR_WEAK_PASSWORD]: () => new WeakPasswordFailure(),
  [SUPABASE_ERROR_VALIDATION_FAILED]: (e) => new InvalidEmailFailure(extractEmailFromError(e)),
  [SUPABASE_ERROR_SESSION_EXPIRED]: () => new TokenExpiredFailure(),
  [SUPABASE_ERROR_OTP_EXPIRED]: () => new OtpExpiredFailure(),
  [SUPABASE_ERROR_OTP_DISABLED]: () => new OtpInvalidFailure(),
  [SUPABASE_ERROR_OVER_REQUEST_RATE_LIMIT]: () => new OtpTooManyRequestsFailure(),
  [SUPABASE_ERROR_OVER_SMS_SEND_RATE_LIMIT]: () => new OtpTooManyRequestsFailure(),
  [SUPABASE_ERROR_IDENTITY_ALREADY_EXISTS]: () =>
    new ProviderConflictFailure('unknown', 'another provider'),
};

function extractEmailFromError(_error: AuthError): string {
  // GoTrue AuthError does not carry the offending email; keep the signature for
  // parity with the Firebase map. Callers fall back to a generic message.
  return 'unknown';
}

/**
 * Maps a supabase-js `AuthError` to the shared `AuthFailure` domain type.
 * Non-auth errors are returned as-is (wrapped as `Error` when needed).
 */
export function mapSupabaseError(error: unknown): Error {
  if (isAuthError(error)) {
    const code = error.code;
    const factory = code ? SUPABASE_ERROR_MAP[code] : undefined;
    if (factory) return factory(error);
    // Fall back on HTTP status for older GoTrue builds that omit `code`.
    if (error.status === 400 && /invalid login credentials/i.test(error.message)) {
      return new InvalidCredentialsFailure();
    }
    if (error.status === 422 && /already registered/i.test(error.message)) {
      return new EmailAlreadyInUseFailure('unknown');
    }
    if (error.status === 429) return new OtpTooManyRequestsFailure();
    return error;
  }
  return error instanceof Error ? error : new Error(String(error));
}
