import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Unlocks device orientation to portrait + landscape for the lifetime of the
 * screen that calls this hook, then restores portrait-only on unmount.
 *
 * Uses a dynamic import so the hook degrades gracefully in dev client builds
 * that pre-date the expo-screen-orientation native module.
 *
 * Web is a no-op — the browser handles orientation natively.
 */
export function useLandscapeOrientation() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let cancelled = false;

    import('expo-screen-orientation')
      .then((m) => {
        if (!cancelled) m.unlockAsync().catch(() => {});
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      import('expo-screen-orientation')
        .then((m) => m.lockAsync(m.OrientationLock.PORTRAIT_UP))
        .catch(() => {});
    };
  }, []);
}
