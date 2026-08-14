import NetInfo from '@react-native-community/netinfo';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Returns `true` when the device has internet connectivity, `false` when offline.
 * On the initial render it defaults to `true` (optimistic) until the first
 * NetInfo event fires.
 *
 * Also re-checks connectivity whenever the app returns to the foreground to
 * prevent stale "offline" state after iOS suspends and resumes the app.
 *
 * **Dev override**: set `EXPO_PUBLIC_FORCE_OFFLINE=true` in `.env.local` to
 * simulate an offline device without touching simulator/emulator network settings.
 */
export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState(true);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    if (__DEV__ && process.env.EXPO_PUBLIC_FORCE_OFFLINE === 'true') {
      setIsOnline(false);
      return;
    }

    // Subscribe to NetInfo changes as the primary source of truth.
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      setIsOnline(state.isInternetReachable ?? state.isConnected ?? true);
    });

    // When the app returns to the foreground after iOS has suspended it, the
    // NetInfo listener may not fire again with fresh data. Force a re-fetch so
    // the UI always reflects the actual network state on resume.
    const unsubscribeAppState = AppState.addEventListener('change', (nextState) => {
      const wasBackground =
        appStateRef.current === 'background' || appStateRef.current === 'inactive';
      appStateRef.current = nextState;

      if (wasBackground && nextState === 'active') {
        // On iOS, isInternetReachable can transiently return false while the
        // network stack wakes up. Set optimistic true immediately, then only
        // confirm offline if isConnected is also false (faster, more reliable
        // on resume than isInternetReachable).
        setIsOnline(true);
        void NetInfo.fetch().then((state) => {
          if (state.isConnected === false) {
            setIsOnline(false);
          }
        });
      }
    });

    return () => {
      unsubscribeNetInfo();
      unsubscribeAppState.remove();
    };
  }, []);

  if (__DEV__ && process.env.EXPO_PUBLIC_FORCE_OFFLINE === 'true') {
    return false;
  }

  return isOnline;
}
