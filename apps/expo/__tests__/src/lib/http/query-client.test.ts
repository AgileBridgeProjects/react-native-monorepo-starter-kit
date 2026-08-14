import { ApiError } from '@lib/http/api-error';
import { onlineManager } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

// ─── Controllable mocks ──────────────────────────────────────────────────────
// query-client.ts wires onlineManager → NetInfo at module load (Platform.OS is
// 'ios' in the test harness, so the native branch runs). Capture the registered
// NetInfo listener + the crash reporter so we can assert the wiring.

type NetState = { isInternetReachable: boolean | null; isConnected: boolean | null };
const netInfo = vi.hoisted(() => ({ listener: null as ((state: NetState) => void) | null }));

vi.mock('@react-native-community/netinfo', () => ({
  default: {
    addEventListener: vi.fn((cb: (state: NetState) => void) => {
      netInfo.listener = cb;
      return () => {
        netInfo.listener = null;
      };
    }),
    fetch: vi.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  },
}));

const recordError = vi.hoisted(() => vi.fn());
vi.mock('@lib/crash-reporting', () => ({
  crashReporter: { recordError, log: vi.fn(), setUserId: vi.fn() },
}));

// Import after mocks so the module-level wiring uses them.
import { queryClient } from '@lib/http/query-client';

type RetryFn = (failureCount: number, error: unknown) => boolean;

function getRetry(): RetryFn {
  const retry = queryClient.getDefaultOptions().queries?.retry;
  if (typeof retry !== 'function') throw new Error('retry default is not a function');
  return retry as RetryFn;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('queryClient default options', () => {
  it('uses a 5-minute staleTime and 10-minute gcTime for queries', () => {
    const queries = queryClient.getDefaultOptions().queries;
    expect(queries?.staleTime).toBe(1000 * 60 * 5);
    expect(queries?.gcTime).toBe(1000 * 60 * 10);
  });

  it('disables retries on mutations', () => {
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(false);
  });

  it('sets refetchOnWindowFocus false on native (Platform.OS=ios harness)', () => {
    expect(queryClient.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false);
  });
});

describe('queryClient retry policy', () => {
  it.each([
    401, 403, 404,
  ] as const)('never retries a %i ApiError (auth/forbidden/not-found are terminal)', (status) => {
    expect(getRetry()(0, new ApiError(status, 'nope'))).toBeFalsy();
  });

  it('retries a 500 ApiError while under the 2-attempt cap', () => {
    expect(getRetry()(0, new ApiError(500, 'server'))).toBeTruthy();
    expect(getRetry()(1, new ApiError(500, 'server'))).toBeTruthy();
  });

  it('stops retrying once the failure count reaches 2', () => {
    expect(getRetry()(2, new ApiError(500, 'server'))).toBeFalsy();
  });

  it('retries a generic (non-ApiError) error under the cap', () => {
    expect(getRetry()(0, new Error('boom'))).toBeTruthy();
    expect(getRetry()(2, new Error('boom'))).toBeFalsy();
  });

  it('retries a 0 (network) ApiError — not in the terminal set', () => {
    expect(getRetry()(0, new ApiError(0, 'offline'))).toBeTruthy();
  });
});

describe('onlineManager ↔ NetInfo wiring', () => {
  // The module-level setEventListener (Platform.OS=ios branch) registered our
  // mocked NetInfo.addEventListener, capturing the listener in netInfo.listener.
  it('registered a NetInfo listener at module load', () => {
    expect(netInfo.listener).toBeTypeOf('function');
  });

  it('reports online when NetInfo says internet is reachable', () => {
    netInfo.listener?.({ isInternetReachable: true, isConnected: true });
    expect(onlineManager.isOnline()).toBeTruthy();
  });

  it('reports offline when NetInfo says internet is not reachable', () => {
    netInfo.listener?.({ isInternetReachable: false, isConnected: false });
    expect(onlineManager.isOnline()).toBeFalsy();
  });

  it('falls back to isConnected when isInternetReachable is null', () => {
    netInfo.listener?.({ isInternetReachable: null, isConnected: false });
    expect(onlineManager.isOnline()).toBeFalsy();
    netInfo.listener?.({ isInternetReachable: null, isConnected: true });
    expect(onlineManager.isOnline()).toBeTruthy();
  });

  it('defaults to online when both reachability signals are null', () => {
    netInfo.listener?.({ isInternetReachable: null, isConnected: null });
    expect(onlineManager.isOnline()).toBeTruthy();
  });
});

describe('query/mutation cache error reporting', () => {
  it('records query errors with a layer:"query" tag', () => {
    const cache = queryClient.getQueryCache();
    cache.config.onError?.(new Error('q-fail'), {} as never);
    expect(recordError).toHaveBeenCalledWith(expect.any(Error), { layer: 'query' });
  });

  it('records mutation errors with a layer:"mutation" tag', () => {
    const cache = queryClient.getMutationCache();
    cache.config.onError?.(
      new Error('m-fail'),
      undefined as never,
      undefined,
      undefined as never,
      {} as never,
    );
    expect(recordError).toHaveBeenCalledWith(expect.any(Error), { layer: 'mutation' });
  });

  it('wraps a non-Error thrown value into an Error before reporting', () => {
    const cache = queryClient.getQueryCache();
    cache.config.onError?.('plain string failure' as never, {} as never);
    expect(recordError).toHaveBeenCalledWith(expect.any(Error), { layer: 'query' });
    const [errorArg] = recordError.mock.calls.at(-1) ?? [];
    expect((errorArg as Error).message).toContain('plain string failure');
  });
});
