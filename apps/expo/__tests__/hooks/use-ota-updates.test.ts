import * as Updates from 'expo-updates';
import { act } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOtaUpdates } from '@/hooks/use-ota-updates';
import { renderHook } from '@/test/utils/render-hook';

const devGlobal = globalThis as typeof globalThis & { __DEV__: boolean };

beforeEach(() => {
  vi.clearAllMocks();
  // The hook no-ops in dev — run these tests as a production bundle would.
  devGlobal.__DEV__ = false;
});

afterEach(() => {
  devGlobal.__DEV__ = true;
});

describe('useOtaUpdates', () => {
  it('checks for an update on mount and fetches when one is available', async () => {
    vi.mocked(Updates.checkForUpdateAsync).mockResolvedValue({
      isAvailable: true,
    } as Awaited<ReturnType<typeof Updates.checkForUpdateAsync>>);

    await act(async () => {
      renderHook(() => useOtaUpdates());
    });

    expect(Updates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
    expect(Updates.fetchUpdateAsync).toHaveBeenCalledTimes(1);
  });

  it('does not fetch when no update is available', async () => {
    vi.mocked(Updates.checkForUpdateAsync).mockResolvedValue({
      isAvailable: false,
    } as Awaited<ReturnType<typeof Updates.checkForUpdateAsync>>);

    await act(async () => {
      renderHook(() => useOtaUpdates());
    });

    expect(Updates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
    expect(Updates.fetchUpdateAsync).not.toHaveBeenCalled();
  });

  it('does not check at all in dev builds', async () => {
    devGlobal.__DEV__ = true;

    await act(async () => {
      renderHook(() => useOtaUpdates());
    });

    expect(Updates.checkForUpdateAsync).not.toHaveBeenCalled();
  });

  it('survives a failing update server without throwing', async () => {
    vi.mocked(Updates.checkForUpdateAsync).mockRejectedValue(new Error('offline'));

    let result: { current: ReturnType<typeof useOtaUpdates> } | undefined;
    await act(async () => {
      ({ result } = renderHook(() => useOtaUpdates()));
    });

    expect(result?.current.isRestartReady).toBeFalsy();
  });

  it('reports restart-ready when a downloaded update is pending', async () => {
    vi.mocked(Updates.useUpdates).mockReturnValue({
      isUpdateAvailable: true,
      isUpdatePending: true,
    } as ReturnType<typeof Updates.useUpdates>);

    let result: { current: ReturnType<typeof useOtaUpdates> } | undefined;
    await act(async () => {
      ({ result } = renderHook(() => useOtaUpdates()));
    });

    expect(result?.current.isRestartReady).toBeTruthy();
  });

  it('restart applies the update via reloadAsync', async () => {
    vi.mocked(Updates.useUpdates).mockReturnValue({
      isUpdateAvailable: true,
      isUpdatePending: true,
    } as ReturnType<typeof Updates.useUpdates>);

    let result: { current: ReturnType<typeof useOtaUpdates> } | undefined;
    await act(async () => {
      ({ result } = renderHook(() => useOtaUpdates()));
    });
    act(() => {
      result?.current.restart();
    });

    expect(Updates.reloadAsync).toHaveBeenCalledTimes(1);
  });
});
