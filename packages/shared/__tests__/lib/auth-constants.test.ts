import { describe, expect, it } from 'vitest';
import {
  accountDisplayIdentifier,
  CUSTOM_AUTH_EMAIL_DOMAIN,
  customAuthUsername,
} from '../../src/lib/auth/auth-constants';

describe('customAuthUsername', () => {
  it('extracts the username from a synthetic custom-auth email', () => {
    expect(customAuthUsername(`testuser${CUSTOM_AUTH_EMAIL_DOMAIN}`)).toBe('testuser');
  });

  it('preserves username casing while matching the domain case-insensitively', () => {
    expect(customAuthUsername(`TestUser${CUSTOM_AUTH_EMAIL_DOMAIN.toUpperCase()}`)).toBe(
      'TestUser',
    );
  });

  it('returns null for a real email address', () => {
    expect(customAuthUsername('person@example.com')).toBeNull();
  });

  it('returns null for empty or missing input', () => {
    expect(customAuthUsername('')).toBeNull();
    expect(customAuthUsername(null)).toBeNull();
    expect(customAuthUsername(undefined)).toBeNull();
  });
});

describe('accountDisplayIdentifier', () => {
  it('returns the username for custom-auth users', () => {
    expect(accountDisplayIdentifier(`testuser${CUSTOM_AUTH_EMAIL_DOMAIN}`)).toBe('testuser');
  });

  it('returns the email for non-custom-auth users', () => {
    expect(accountDisplayIdentifier('person@example.com')).toBe('person@example.com');
  });

  it('returns null when there is no email', () => {
    expect(accountDisplayIdentifier(null)).toBeNull();
    expect(accountDisplayIdentifier(undefined)).toBeNull();
  });
});
