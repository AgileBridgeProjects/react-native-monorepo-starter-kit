import {
  InvalidCredentialsFailure,
  InvalidEmailFailure,
} from '@features/auth/domain/failures/auth.failure';
import { getErrorMessage } from '@lib/error-message';
import { i18n } from '@lib/i18n';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lib/i18n', () => ({
  i18n: { t: vi.fn() },
}));

describe('getErrorMessage', () => {
  beforeEach(() => {
    // Cast to never to bypass i18next's strict TFunction overload typing in tests
    vi.mocked(i18n.t).mockImplementation(((key: string) => `[${key}]`) as never);
  });

  it('returns null for null input', () => {
    expect(getErrorMessage(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(getErrorMessage(undefined)).toBeNull();
  });

  it('resolves locale key for domain failures', () => {
    const error = new InvalidCredentialsFailure();
    const result = getErrorMessage(error);
    expect(i18n.t).toHaveBeenCalledWith('auth.invalidCredentials', { ns: 'errors' });
    expect(result).toBe('[auth.invalidCredentials]');
  });

  it('passes localeParams to i18n.t', () => {
    const error = new InvalidEmailFailure('bad@test');
    getErrorMessage(error);
    expect(i18n.t).toHaveBeenCalledWith('auth.invalidEmail', { ns: 'errors', email: 'bad@test' });
  });

  it('returns generic fallback for non-failure errors', () => {
    const error = new Error('Some API error');
    const result = getErrorMessage(error);
    expect(i18n.t).toHaveBeenCalledWith('auth.unknown', { ns: 'errors' });
    expect(result).toBe('[auth.unknown]');
  });

  it('returns generic fallback for non-Error objects', () => {
    const result = getErrorMessage('string error');
    expect(result).toBe('[auth.unknown]');
  });
});
