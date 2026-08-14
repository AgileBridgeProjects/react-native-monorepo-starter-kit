import {
  AuthFailure,
  EmailAlreadyInUseFailure,
  InvalidCredentialsFailure,
  InvalidEmailFailure,
  TokenExpiredFailure,
  UserNotFoundFailure,
  WeakPasswordFailure,
} from '@features/auth/domain/failures/auth.failure';
import { describe, expect, it } from 'vitest';

describe('Auth failures', () => {
  it('InvalidCredentialsFailure is an AuthFailure with correct locale key', () => {
    const f = new InvalidCredentialsFailure();
    expect(f).toBeInstanceOf(AuthFailure);
    expect(f).toBeInstanceOf(Error);
    expect(f.name).toBe('InvalidCredentialsFailure');
    expect(f.localeKey).toBe('auth.invalidCredentials');
    expect(f.localeParams).toBeUndefined();
  });

  it('InvalidEmailFailure carries email in localeParams', () => {
    const f = new InvalidEmailFailure('notvalid');
    expect(f.localeKey).toBe('auth.invalidEmail');
    expect(f.localeParams).toEqual({ email: 'notvalid' });
    expect(f.message).toContain('notvalid');
  });

  it('TokenExpiredFailure has the correct name and locale key', () => {
    const f = new TokenExpiredFailure();
    expect(f.name).toBe('TokenExpiredFailure');
    expect(f.localeKey).toBe('auth.tokenExpired');
  });

  it('UserNotFoundFailure has the correct locale key', () => {
    const f = new UserNotFoundFailure();
    expect(f.localeKey).toBe('auth.userNotFound');
  });

  it('EmailAlreadyInUseFailure carries email in localeParams', () => {
    const f = new EmailAlreadyInUseFailure('alice@example.com');
    expect(f.localeKey).toBe('auth.emailAlreadyInUse');
    expect(f.localeParams).toEqual({ email: 'alice@example.com' });
    expect(f.message).toContain('alice@example.com');
  });

  it('WeakPasswordFailure is an AuthFailure with correct locale key', () => {
    const f = new WeakPasswordFailure();
    expect(f).toBeInstanceOf(AuthFailure);
    expect(f.name).toBe('WeakPasswordFailure');
    expect(f.localeKey).toBe('auth.weakPassword');
  });
});
