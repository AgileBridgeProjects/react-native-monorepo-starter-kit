import { act } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useIsOnline } from '@/src/lib/hooks/use-is-online';
import { renderHook } from '@/test/utils/render-hook';

// ─── Controllable mocks ──────────────────────────────────────────────────────

const mockNetInfoFetch = vi.hoisted(() => vi.fn());

let netInfoListener:
  | ((state: { isInternetReachable: boolean | null; isConnected: boolean | null }) => void)
  | null = null;
let appStateListener: ((nextState: string) => void) | null = null;
let simulatedAppState = 'active';

vi.mock('@react-native-community/netinfo', () => ({
  default: {
    addEventListener: (
      cb: (state: { isInternetReachable: boolean | null; isConnected: boolean | null }) => void,
    ) => {
      netInfoListener = cb;
      return () => {
        netInfoListener = null;
      };
    },
    fetch: mockNetInfoFetch,
  },
}));

vi.mock('react-native', () => ({
  AppState: {
    get currentState() {
      return simulatedAppState;
    },
    addEventListener: (_event: string, cb: (nextState: string) => void) => {
      appStateListener = cb;
      return {
        remove: () => {
          appStateListener = null;
        },
      };
    },
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fireNetInfo(isInternetReachable: boolean | null, isConnected: boolean | null) {
  act(() => {
    netInfoListener?.({ isInternetReachable, isConnected });
  });
}

async function transitionAppState(from: string, to: string) {
  act(() => {
    simulatedAppState = from;
    appStateListener?.(from);
  });
  await act(async () => {
    simulatedAppState = to;
    appStateListener?.(to);
  });
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

beforeEach(() => {
  simulatedAppState = 'active';
  netInfoListener = null;
  appStateListener = null;
  mockNetInfoFetch.mockResolvedValue({ isInternetReachable: true, isConnected: true });
});

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.EXPO_PUBLIC_FORCE_OFFLINE;
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useIsOnline', () => {
  describe('initial state', () => {
    it('defaults to true (optimistic) before any NetInfo event', () => {
      const { result } = renderHook(() => useIsOnline());
      expect(result.current).toBe(true);
    });

    it('returns false when EXPO_PUBLIC_FORCE_OFFLINE is "true"', () => {
      process.env.EXPO_PUBLIC_FORCE_OFFLINE = 'true';
      const { result } = renderHook(() => useIsOnline());
      expect(result.current).toBe(false);
    });
  });

  describe('NetInfo subscription', () => {
    it('updates to false when NetInfo reports offline', () => {
      const { result } = renderHook(() => useIsOnline());
      fireNetInfo(false, false);
      expect(result.current).toBe(false);
    });

    it('updates back to true when NetInfo reports online again', () => {
      const { result } = renderHook(() => useIsOnline());
      fireNetInfo(false, false);
      fireNetInfo(true, true);
      expect(result.current).toBe(true);
    });

    it('falls back to isConnected when isInternetReachable is null', () => {
      const { result } = renderHook(() => useIsOnline());
      fireNetInfo(null, false);
      expect(result.current).toBe(false);
    });

    it('falls back to isConnected=true when isInternetReachable is null', () => {
      const { result } = renderHook(() => useIsOnline());
      fireNetInfo(null, true);
      expect(result.current).toBe(true);
    });

    it('defaults to true when both isInternetReachable and isConnected are null', () => {
      const { result } = renderHook(() => useIsOnline());
      fireNetInfo(null, null);
      expect(result.current).toBe(true);
    });
  });

  describe('AppState foreground re-check', () => {
    it('calls NetInfo.fetch() when transitioning from background to active', async () => {
      renderHook(() => useIsOnline());
      await transitionAppState('background', 'active');
      expect(mockNetInfoFetch).toHaveBeenCalledTimes(1);
    });

    it('calls NetInfo.fetch() when transitioning from inactive to active', async () => {
      renderHook(() => useIsOnline());
      await transitionAppState('inactive', 'active');
      expect(mockNetInfoFetch).toHaveBeenCalledTimes(1);
    });

    it('does NOT call NetInfo.fetch() when app stays active', async () => {
      renderHook(() => useIsOnline());
      await transitionAppState('active', 'active');
      expect(mockNetInfoFetch).not.toHaveBeenCalled();
    });

    it('does NOT call NetInfo.fetch() when going to background', async () => {
      renderHook(() => useIsOnline());
      await transitionAppState('active', 'background');
      expect(mockNetInfoFetch).not.toHaveBeenCalled();
    });

    it('sets offline when both isInternetReachable and isConnected are false on resume', async () => {
      mockNetInfoFetch.mockResolvedValue({ isInternetReachable: false, isConnected: false });
      const { result } = renderHook(() => useIsOnline());
      await transitionAppState('background', 'active');
      expect(result.current).toBe(false);
    });

    it('stays online when isInternetReachable is false but isConnected is true (iOS wakeup transient)', async () => {
      mockNetInfoFetch.mockResolvedValue({ isInternetReachable: false, isConnected: true });
      const { result } = renderHook(() => useIsOnline());
      fireNetInfo(false, false); // simulate stale NetInfo event before resume
      expect(result.current).toBe(false);
      await transitionAppState('background', 'active');
      // isConnected=true means network stack is up — should not stay offline
      expect(result.current).toBe(true);
    });

    it('stays online when isInternetReachable is false but isConnected is null on resume', async () => {
      mockNetInfoFetch.mockResolvedValue({ isInternetReachable: false, isConnected: null });
      const { result } = renderHook(() => useIsOnline());
      await transitionAppState('background', 'active');
      expect(result.current).toBe(true);
    });

    it('is optimistically true immediately on resume before fetch resolves', async () => {
      let resolveFetch!: () => void;
      mockNetInfoFetch.mockReturnValue(
        new Promise<{ isInternetReachable: boolean; isConnected: boolean }>((resolve) => {
          resolveFetch = () => resolve({ isInternetReachable: false, isConnected: false });
        }),
      );
      const { result } = renderHook(() => useIsOnline());
      fireNetInfo(false, false);
      expect(result.current).toBe(false);

      // Trigger resume — should flip to true optimistically before fetch settles
      act(() => {
        simulatedAppState = 'background';
        appStateListener?.('background');
      });
      act(() => {
        simulatedAppState = 'active';
        appStateListener?.('active');
      });
      expect(result.current).toBe(true);

      // Now let the fetch resolve with offline result
      await act(async () => {
        resolveFetch();
        await Promise.resolve();
      });
      expect(result.current).toBe(false);
    });
  });
});
