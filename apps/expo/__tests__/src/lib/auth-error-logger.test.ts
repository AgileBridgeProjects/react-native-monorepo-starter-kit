import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── crash-reporting mock ─────────────────────────────────────────────────────
const recordError = vi.fn();
vi.mock('@lib/crash-reporting', () => ({
  crashReporter: {
    recordError: (...args: unknown[]) => recordError(...args),
    log: vi.fn(),
    setUserId: vi.fn(),
    setAttribute: vi.fn(),
  },
}));

// ─── react-native Platform mock (mutable OS per test) ─────────────────────────
const platform = { OS: 'web' };
vi.mock('react-native', () => ({
  Platform: platform,
}));

// ─── localStorage shim ────────────────────────────────────────────────────────
function makeLocalStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => {
      store[k] = v;
    }),
    removeItem: vi.fn((k: string) => {
      delete store[k];
    }),
    clear: () => {
      store = {};
    },
  };
}

const STORAGE_KEY = 'starterkit_auth_errors';

/**
 * Each test re-imports the logger so the module-level circular buffer is fresh.
 */
async function freshLogger() {
  vi.resetModules();
  return import('@lib/auth-error-logger');
}

describe('auth-error-logger', () => {
  let localStorageMock: ReturnType<typeof makeLocalStorage>;

  beforeEach(() => {
    vi.clearAllMocks();
    platform.OS = 'web';
    localStorageMock = makeLocalStorage();
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('logAuthError', () => {
    it('records the error to the in-memory buffer', async () => {
      const { logAuthError, getAuthErrors } = await freshLogger();
      logAuthError('google', new Error('token expired'));
      const errors = getAuthErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].provider).toBe('google');
      expect(errors[0].message).toBe('token expired');
      expect(errors[0].platform).toBe('web');
    });

    it('forwards the error to the crash reporter with auth context', async () => {
      const { logAuthError } = await freshLogger();
      const err = new Error('boom');
      logAuthError('microsoft', err);
      expect(recordError).toHaveBeenCalledWith(err, {
        feature: 'auth',
        provider: 'microsoft',
        code: 'Error',
      });
    });

    it('wraps non-Error values in an Error for the crash reporter', async () => {
      const { logAuthError } = await freshLogger();
      logAuthError('phone', 'string failure');
      const [errorArg, context] = recordError.mock.calls[0];
      expect(errorArg).toBeInstanceOf(Error);
      expect((errorArg as Error).message).toBe('string failure');
      expect(context).toMatchObject({ feature: 'auth', provider: 'phone', code: 'unknown' });
    });

    it('redacts email addresses in the stored message', async () => {
      const { logAuthError, getAuthErrors } = await freshLogger();
      logAuthError('email', new Error('login failed for user@example.com please retry'));
      expect(getAuthErrors()[0].message).toBe('login failed for [redacted] please retry');
    });

    it('redacts multiple emails in one message', async () => {
      const { logAuthError, getAuthErrors } = await freshLogger();
      logAuthError('email', new Error('a@b.com and c.d@e.co.za'));
      expect(getAuthErrors()[0].message).toBe('[redacted] and [redacted]');
    });

    it('captures the meta object on the entry', async () => {
      const { logAuthError, getAuthErrors } = await freshLogger();
      logAuthError('google', new Error('x'), { attempt: 2 });
      expect(getAuthErrors()[0].meta).toEqual({ attempt: 2 });
    });

    it('extracts a firebase-style string code', async () => {
      const { logAuthError, getAuthErrors } = await freshLogger();
      const err = Object.assign(new Error('nope'), { code: 'auth/wrong-password' });
      logAuthError('email', err);
      expect(getAuthErrors()[0].code).toBe('auth/wrong-password');
    });

    it('falls back to the error name when no code present', async () => {
      const { logAuthError, getAuthErrors } = await freshLogger();
      logAuthError('email', new TypeError('bad'));
      expect(getAuthErrors()[0].code).toBe('TypeError');
    });

    it('uses "unknown" code for non-Error values', async () => {
      const { logAuthError, getAuthErrors } = await freshLogger();
      logAuthError('phone', { weird: true });
      expect(getAuthErrors()[0].code).toBe('unknown');
    });

    it('ignores a non-string code property and uses the name', async () => {
      const { logAuthError, getAuthErrors } = await freshLogger();
      const err = Object.assign(new RangeError('r'), { code: 42 });
      logAuthError('email', err);
      expect(getAuthErrors()[0].code).toBe('RangeError');
    });

    it('keeps the buffer circular at 100 entries (drops oldest)', async () => {
      const { logAuthError, getAuthErrors } = await freshLogger();
      for (let i = 0; i < 105; i++) {
        logAuthError('google', new Error(`err-${i}`));
      }
      const errors = getAuthErrors();
      expect(errors).toHaveLength(100);
      expect(errors[0].message).toBe('err-5');
      expect(errors[99].message).toBe('err-104');
    });

    it('persists the buffer to localStorage on web', async () => {
      const { logAuthError } = await freshLogger();
      logAuthError('google', new Error('persist me'));
      expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
      const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEY) as string);
      expect(stored[0].message).toBe('persist me');
    });

    it('does not touch localStorage on native', async () => {
      platform.OS = 'ios';
      const { logAuthError, getAuthErrors } = await freshLogger();
      logAuthError('google', new Error('native'));
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
      // Still captured in-memory.
      expect(getAuthErrors()[0].platform).toBe('ios');
    });

    it('degrades silently when persistence throws', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('quota');
      });
      const { logAuthError, getAuthErrors } = await freshLogger();
      expect(() => logAuthError('google', new Error('x'))).not.toThrow();
      expect(getAuthErrors()).toHaveLength(1);
    });
  });

  describe('hydration', () => {
    it('hydrates the buffer from localStorage on web (first access)', async () => {
      const seeded = [
        {
          ts: '2026-01-01T00:00:00.000Z',
          provider: 'google',
          code: 'x',
          message: 'old',
          platform: 'web',
        },
      ];
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(seeded));
      const { getAuthErrors } = await freshLogger();
      const errors = getAuthErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('old');
    });

    it('starts empty when stored JSON is corrupt', async () => {
      localStorageMock.setItem(STORAGE_KEY, '{not valid json');
      const { getAuthErrors } = await freshLogger();
      expect(getAuthErrors()).toHaveLength(0);
    });

    it('starts empty when nothing is stored', async () => {
      const { getAuthErrors } = await freshLogger();
      expect(getAuthErrors()).toHaveLength(0);
    });

    it('does not hydrate from localStorage on native', async () => {
      platform.OS = 'ios';
      localStorageMock.setItem(
        STORAGE_KEY,
        JSON.stringify([
          { message: 'should-not-load', provider: 'g', code: 'c', ts: '', platform: 'web' },
        ]),
      );
      const { getAuthErrors } = await freshLogger();
      expect(getAuthErrors()).toHaveLength(0);
    });
  });

  describe('clearAuthErrors', () => {
    it('empties the buffer and persists the empty state', async () => {
      const { logAuthError, clearAuthErrors, getAuthErrors } = await freshLogger();
      logAuthError('google', new Error('x'));
      clearAuthErrors();
      expect(getAuthErrors()).toHaveLength(0);
      expect(localStorageMock.getItem(STORAGE_KEY)).toBe('[]');
    });

    it('prevents re-hydration after clearing (marks hydrated)', async () => {
      localStorageMock.setItem(
        STORAGE_KEY,
        JSON.stringify([{ message: 'seed', provider: 'g', code: 'c', ts: '', platform: 'web' }]),
      );
      const { clearAuthErrors, getAuthErrors } = await freshLogger();
      clearAuthErrors();
      // A subsequent read must not re-load the seeded entry.
      expect(getAuthErrors()).toHaveLength(0);
    });
  });
});
