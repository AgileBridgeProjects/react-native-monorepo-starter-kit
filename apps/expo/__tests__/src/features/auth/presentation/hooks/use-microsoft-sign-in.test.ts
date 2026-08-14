import { useMicrosoftSignIn } from '@features/auth/presentation/hooks/use-microsoft-sign-in';
import { act } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHook } from '@/test/utils/render-hook';

// ─── Mutable platform (hoisted so the factory can reference it safely) ──────────
const platform = vi.hoisted(() => ({ OS: 'ios' as 'ios' | 'android' | 'web' }));
vi.mock('react-native', async () => {
  const actual = await import('@/test/mocks/react-native');
  return { ...actual, Platform: platform };
});

// ─── expo-auth-session (driven per-test) ─────────────────────────────────────────
const promptAsync = vi.fn();
const exchangeCodeAsync = vi.fn();
const authSessionState: {
  discovery: unknown;
  request: { codeVerifier?: string } | null;
  response: unknown;
} = {
  discovery: { tokenEndpoint: 'https://ms/token' },
  request: { codeVerifier: 'verifier-1' },
  response: null,
};

vi.mock('expo-auth-session', () => ({
  useAutoDiscovery: () => authSessionState.discovery,
  makeRedirectUri: () => 'starterkit-mobile://auth/microsoft',
  useAuthRequest: () => [authSessionState.request, authSessionState.response, promptAsync],
  exchangeCodeAsync: (...a: unknown[]) => exchangeCodeAsync(...a),
}));

let linkingHandler: ((event: { url: string }) => void) | null = null;
const linkingRemove = vi.fn();
vi.mock('expo-linking', () => ({
  addEventListener: (_event: string, handler: (e: { url: string }) => void) => {
    linkingHandler = handler;
    return { remove: linkingRemove };
  },
  parse: (url: string) => {
    const query = url.split('?')[1] ?? '';
    const params = Object.fromEntries(new URLSearchParams(query));
    return { queryParams: params };
  },
}));

vi.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: vi.fn() }));

// ─── Collaborators ───────────────────────────────────────────────────────────────
const exchangeToken = vi.fn();
vi.mock('@features/auth/infrastructure/datasources/microsoft-auth.datasource', () => ({
  microsoftAuthDatasource: { exchangeToken: (...a: unknown[]) => exchangeToken(...a) },
}));

const finalizeAuthSession = vi.fn();
vi.mock('@features/auth/presentation/hooks/use-finalize-auth-session', () => ({
  useFinalizeAuthSession: () => finalizeAuthSession,
}));

const generatePKCE = vi.fn();
const generateState = vi.fn();
vi.mock('@features/auth/infrastructure/utils/microsoft-pkce', () => ({
  generatePKCE: () => generatePKCE(),
  generateState: () => generateState(),
  MS_PKCE_VERIFIER_KEY: 'ms_pkce_verifier',
  MS_PKCE_STATE_KEY: 'ms_pkce_state',
}));

const logAuthError = vi.fn();
vi.mock('@/src/lib/auth-error-logger', () => ({
  logAuthError: (...a: unknown[]) => logAuthError(...a),
}));

// ─── web globals shim (test env is node, not jsdom) ──────────────────────────────
const sessionStore: Record<string, string> = {};
const sessionStorageMock = {
  setItem: (k: string, v: string) => {
    sessionStore[k] = v;
  },
  getItem: (k: string) => sessionStore[k] ?? null,
};
const locationMock = { origin: 'https://app.local', href: '' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  platform.OS = 'ios';
  authSessionState.discovery = { tokenEndpoint: 'https://ms/token' };
  authSessionState.request = { codeVerifier: 'verifier-1' };
  authSessionState.response = null;
  linkingHandler = null;
  for (const k of Object.keys(sessionStore)) delete sessionStore[k];
  (globalThis as Record<string, unknown>).sessionStorage = sessionStorageMock;
  (globalThis as Record<string, unknown>).window = { location: locationMock };
  locationMock.href = '';
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

// ════════════════════════════════════════════════════════════════════════════════
describe('useMicrosoftSignIn — interface', () => {
  it('exposes signIn, cancel, isLoading, isReady and error', () => {
    const { result } = renderHook(() => useMicrosoftSignIn());
    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.cancel).toBe('function');
    expect(result.current.isLoading).toBeFalsy();
    expect(result.current.error).toBeNull();
  });

  it('is ready on native only when the auth request is constructed', () => {
    authSessionState.request = { codeVerifier: 'verifier-1' };
    expect(renderHook(() => useMicrosoftSignIn()).result.current.isReady).toBeTruthy();

    authSessionState.request = null;
    expect(renderHook(() => useMicrosoftSignIn()).result.current.isReady).toBeFalsy();
  });

  it('is always ready on web', () => {
    platform.OS = 'web';
    authSessionState.request = null;
    expect(renderHook(() => useMicrosoftSignIn()).result.current.isReady).toBeTruthy();
  });
});

describe('useMicrosoftSignIn — native flow', () => {
  it('prompts the auth browser when signIn is called with discovery ready', async () => {
    const { result } = renderHook(() => useMicrosoftSignIn());
    await act(async () => {
      await result.current.signIn();
    });
    expect(promptAsync).toHaveBeenCalledTimes(1);
  });

  it('surfaces a "login unavailable" error when discovery is not ready', async () => {
    authSessionState.discovery = undefined;
    const { result } = renderHook(() => useMicrosoftSignIn());

    await act(async () => {
      await result.current.signIn();
    });

    expect(promptAsync).not.toHaveBeenCalled();
    expect(result.current.error?.message).toContain('unavailable');
  });

  it('times out and surfaces an error if the browser never returns', async () => {
    const { result } = renderHook(() => useMicrosoftSignIn());
    await act(async () => {
      await result.current.signIn();
    });

    act(() => {
      vi.advanceTimersByTime(90_000);
    });

    expect(result.current.error?.message).toContain('timed out');
    expect(result.current.isLoading).toBeFalsy();
  });

  it('exchanges the code via the datasource and finalises the session on a successful auth-session response', async () => {
    exchangeCodeAsync.mockResolvedValue({ idToken: 'ms-id-token' });
    exchangeToken.mockResolvedValue({ user: { id: 'u1' }, idToken: 'fb-token' });
    finalizeAuthSession.mockResolvedValue(undefined);
    const onSuccess = vi.fn();

    authSessionState.response = { type: 'success', params: { code: 'auth-code-1' } };
    const { rerender } = renderHook(() => useMicrosoftSignIn(onSuccess));
    // Let the response effect + async mutation settle.
    await act(async () => {
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();
    });
    rerender();
    await act(async () => {
      await Promise.resolve();
    });

    expect(exchangeCodeAsync).toHaveBeenCalled();
    expect(exchangeToken).toHaveBeenCalledWith('ms-id-token');
    expect(finalizeAuthSession).toHaveBeenCalledWith({ id: 'u1' }, 'fb-token');
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('completes the flow from the Linking fallback redirect (dev-client path)', async () => {
    exchangeCodeAsync.mockResolvedValue({ idToken: 'ms-id-token' });
    exchangeToken.mockResolvedValue({ user: { id: 'u1' }, idToken: 'fb-token' });
    finalizeAuthSession.mockResolvedValue(undefined);

    renderHook(() => useMicrosoftSignIn());
    expect(linkingHandler).toBeTruthy();

    await act(async () => {
      linkingHandler?.({ url: 'starterkit-mobile://auth/microsoft?code=link-code-1' });
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();
    });

    expect(exchangeToken).toHaveBeenCalledWith('ms-id-token');
  });

  it('logs an auth error when the native exchange fails', async () => {
    exchangeCodeAsync.mockResolvedValue({ idToken: 'ms-id-token' });
    exchangeToken.mockRejectedValue(new Error('exchange failed'));

    renderHook(() => useMicrosoftSignIn());
    await act(async () => {
      linkingHandler?.({ url: 'starterkit-mobile://auth/microsoft?code=c1' });
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();
    });

    expect(logAuthError).toHaveBeenCalledWith('microsoft', expect.any(Error), {
      flow: 'native-pkce',
    });
  });

  it('cancel clears the waiting state', async () => {
    const { result } = renderHook(() => useMicrosoftSignIn());
    await act(async () => {
      await result.current.signIn();
    });
    act(() => {
      result.current.cancel();
    });
    expect(result.current.isLoading).toBeFalsy();
  });
});

describe('useMicrosoftSignIn — web flow', () => {
  beforeEach(() => {
    platform.OS = 'web';
  });

  it('persists the PKCE verifier + state and redirects to the Microsoft authorize endpoint', async () => {
    generatePKCE.mockResolvedValue({ codeVerifier: 'v-1', codeChallenge: 'c-1' });
    generateState.mockReturnValue('state-1');
    const { result } = renderHook(() => useMicrosoftSignIn());

    await act(async () => {
      await result.current.signIn();
    });

    expect(sessionStore.ms_pkce_verifier).toBe('v-1');
    expect(sessionStore.ms_pkce_state).toBe('state-1');
    const url = new URL(locationMock.href);
    expect(url.origin + url.pathname).toContain('login.microsoftonline.com');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('code_challenge')).toBe('c-1');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBe('state-1');
    expect(url.searchParams.get('redirect_uri')).toBe('https://app.local/auth/microsoft');
  });

  it('surfaces and logs the error if PKCE generation fails', async () => {
    generatePKCE.mockRejectedValue(new Error('crypto unavailable'));
    const { result } = renderHook(() => useMicrosoftSignIn());

    await act(async () => {
      await result.current.signIn();
    });

    expect(result.current.error?.message).toBe('crypto unavailable');
    expect(result.current.isLoading).toBeFalsy();
    expect(logAuthError).toHaveBeenCalledWith('microsoft', expect.any(Error), {
      flow: 'web-pkce',
    });
  });
});
