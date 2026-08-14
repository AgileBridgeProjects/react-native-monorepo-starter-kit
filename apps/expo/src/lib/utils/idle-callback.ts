type IdleCallbackHandle = number | ReturnType<typeof setTimeout>;

export function scheduleIdleCallback(callback: () => void): IdleCallbackHandle {
  if (typeof globalThis.requestIdleCallback === 'function') {
    return globalThis.requestIdleCallback(() => callback());
  }

  return setTimeout(callback, 1);
}

export function cancelScheduledIdleCallback(handle: IdleCallbackHandle): void {
  if (typeof globalThis.cancelIdleCallback === 'function' && typeof handle === 'number') {
    globalThis.cancelIdleCallback(handle);
    return;
  }

  clearTimeout(handle);
}
