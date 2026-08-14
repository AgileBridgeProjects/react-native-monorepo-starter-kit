import {
  AuthFailure,
  EmailAlreadyInUseFailure,
  InvalidCredentialsFailure,
  TokenExpiredFailure,
  WeakPasswordFailure,
} from '@starterkit/shared';
import { describe, expect, it } from 'vitest';

describe('Auth failures', () => {
  it('AuthFailure carries localeKey', () => {
    const failure = new AuthFailure('dev message', 'auth.someKey');
    expect(failure).toBeInstanceOf(Error);
    expect(failure.name).toBe('AuthFailure');
    expect(failure.localeKey).toBe('auth.someKey');
  });

  it('InvalidCredentialsFailure has correct localeKey', () => {
    const failure = new InvalidCredentialsFailure();
    expect(failure.name).toBe('InvalidCredentialsFailure');
    expect(failure.localeKey).toBe('auth.invalidCredentials');
  });

  it('EmailAlreadyInUseFailure carries email in localeParams', () => {
    const failure = new EmailAlreadyInUseFailure('alice@example.com');
    expect(failure.localeKey).toBe('auth.emailAlreadyInUse');
    expect(failure.localeParams?.email).toBe('alice@example.com');
  });

  it('WeakPasswordFailure has correct localeKey', () => {
    const failure = new WeakPasswordFailure();
    expect(failure.localeKey).toBe('auth.weakPassword');
  });

  it('TokenExpiredFailure has correct localeKey', () => {
    const failure = new TokenExpiredFailure();
    expect(failure.localeKey).toBe('auth.tokenExpired');
  });

  it('failures are instanceof Error and instanceof AuthFailure', () => {
    const failure = new InvalidCredentialsFailure();
    expect(failure).toBeInstanceOf(Error);
    expect(failure).toBeInstanceOf(AuthFailure);
  });
});
