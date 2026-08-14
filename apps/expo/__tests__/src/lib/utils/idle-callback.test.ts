import { cancelScheduledIdleCallback, scheduleIdleCallback } from '@lib/utils/idle-callback';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('idle-callback', () => {
  const mutableGlobal = globalThis as typeof globalThis & {
    requestIdleCallback?: typeof globalThis.requestIdleCallback;
    cancelIdleCallback?: typeof globalThis.cancelIdleCallback;
  };
  const originalRequestIdleCallback = globalThis.requestIdleCallback;
  const originalCancelIdleCallback = globalThis.cancelIdleCallback;

  afterEach(() => {
    mutableGlobal.requestIdleCallback = originalRequestIdleCallback;
    mutableGlobal.cancelIdleCallback = originalCancelIdleCallback;
    vi.restoreAllMocks();
  });

  it('uses requestIdleCallback when the browser API exists', () => {
    const callback = vi.fn();
    const requestIdleCallback = vi.fn((cb: () => void) => {
      cb();
      return 42;
    });

    mutableGlobal.requestIdleCallback =
      requestIdleCallback as unknown as typeof globalThis.requestIdleCallback;

    const handle = scheduleIdleCallback(callback);

    expect(handle).toBe(42);
    expect(requestIdleCallback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('falls back to setTimeout when requestIdleCallback is unavailable', () => {
    const callback = vi.fn();
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    Reflect.deleteProperty(mutableGlobal as Record<string, unknown>, 'requestIdleCallback');

    const handle = scheduleIdleCallback(callback);

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(handle).toBeTruthy();
  });

  it('uses cancelIdleCallback when cancelling a native idle handle', () => {
    const cancelIdleCallback = vi.fn();

    mutableGlobal.cancelIdleCallback = cancelIdleCallback as typeof globalThis.cancelIdleCallback;

    cancelScheduledIdleCallback(7);

    expect(cancelIdleCallback).toHaveBeenCalledWith(7);
  });
});
