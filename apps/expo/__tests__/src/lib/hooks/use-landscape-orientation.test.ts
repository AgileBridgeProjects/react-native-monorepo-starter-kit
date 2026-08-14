import { act } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHook } from '@/test/utils/render-hook';

// ─── Controllable expo-screen-orientation mock ──────────────────────────────────
// The hook dynamically imports this module; it is not installed in the test env,
// so we provide it explicitly to assert lock/unlock calls.
const unlockAsync = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const lockAsync = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('expo-screen-orientation', () => ({
  unlockAsync,
  lockAsync,
  OrientationLock: { PORTRAIT_UP: 'PORTRAIT_UP' },
}));

const platform = vi.hoisted(() => ({ OS: 'ios' as string }));
vi.mock('react-native', () => ({
  Platform: {
    get OS() {
      return platform.OS;
    },
  },
}));

// Import after mocks so the dynamic import resolves to the mock.
import { useLandscapeOrientation } from '@lib/hooks/use-landscape-orientation';

// The hook chains a dynamic import() → .then(). Draining only microtasks is not
// always enough for the module-resolution promise, so yield to a real macrotask.
async function flushAsync() {
  await act(async () => {
    // Several macrotask/microtask cycles so import() → .then() → .then() chains
    // (mount unlock and cleanup lock) fully settle.
    for (let i = 0; i < 4; i++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      await Promise.resolve();
    }
  });
}

beforeEach(async () => {
  // Drain any dynamic-import promise chains still pending from a prior test so
  // their unlock/lock calls land before we clear, keeping each test isolated.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  platform.OS = 'ios';
  unlockAsync.mockClear();
  lockAsync.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useLandscapeOrientation', () => {
  it('unlocks orientation (portrait + landscape) on mount on native', async () => {
    const { unmount } = renderHook(() => useLandscapeOrientation());
    // Poll rather than a fixed flush — the dynamic import() → .then() chain can take a
    // variable number of cycles to settle, which was flaky under slower CI timing.
    await vi.waitFor(() => expect(unlockAsync).toHaveBeenCalledTimes(1));

    expect(lockAsync).not.toHaveBeenCalled();
    unmount();
    await flushAsync();
  });

  it('re-locks to portrait on unmount', async () => {
    const { unmount } = renderHook(() => useLandscapeOrientation());
    await flushAsync();

    unmount();
    await vi.waitFor(() => expect(lockAsync).toHaveBeenCalledWith('PORTRAIT_UP'));
  });

  it('is a no-op on web (never touches orientation)', async () => {
    platform.OS = 'web';
    const { unmount } = renderHook(() => useLandscapeOrientation());
    await flushAsync();

    unmount();
    await flushAsync();

    expect(unlockAsync).not.toHaveBeenCalled();
    expect(lockAsync).not.toHaveBeenCalled();
  });

  it('does not unlock if unmounted before the dynamic import resolves (cancelled guard)', async () => {
    const { unmount } = renderHook(() => useLandscapeOrientation());
    // unmount synchronously, before the mount import().then runs the unlock
    unmount();
    // Settle both dynamic-import chains, then assert the guard held: the cancelled
    // mount-unlock must never fire. (The unmount re-lock is covered by the
    // "re-locks to portrait on unmount" test; asserting it here races the two
    // import() chains and is flaky under CI timing.)
    await flushAsync();
    expect(unlockAsync).not.toHaveBeenCalled();
  });

  it('swallows unlock rejections without throwing', async () => {
    unlockAsync.mockRejectedValueOnce(new Error('module missing'));
    let unmount: () => void = () => {};
    expect(() => {
      ({ unmount } = renderHook(() => useLandscapeOrientation()));
    }).not.toThrow();
    await flushAsync();
    expect(unlockAsync).toHaveBeenCalled();
    unmount();
    await flushAsync();
  });
});
