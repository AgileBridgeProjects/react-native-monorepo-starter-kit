import * as Updates from 'expo-updates';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/** Minimum time between OTA checks — avoids hammering the update server on rapid foregrounds. */
const OTA_CHECK_MIN_INTERVAL_MS = 5 * 60 * 1000;

export interface OtaUpdatesResult {
  /** True when a new update has been downloaded and a restart would apply it. */
  isRestartReady: boolean;
  /** Apply the downloaded update immediately by reloading the JS bundle. */
  restart: () => void;
}

/**
 * Checks for OTA (EAS) updates on launch and whenever the app returns to the
 * foreground, downloads any available update in the background, and reports
 * when a restart would apply it.
 *
 * Without this hook the default `checkAutomatically: ON_LAUNCH` behaviour
 * downloads silently and applies on the *next* cold start with zero user
 * feedback — testers and users can sit on stale bundles for days.
 *
 * No-ops in dev clients and any build where expo-updates is disabled.
 */
export function useOtaUpdates(): OtaUpdatesResult {
  const { isUpdatePending } = Updates.useUpdates();
  const lastCheckAtRef = useRef(0);

  const checkAndFetch = useCallback(async () => {
    if (__DEV__ || !Updates.isEnabled) return;
    const now = Date.now();
    if (now - lastCheckAtRef.current < OTA_CHECK_MIN_INTERVAL_MS) return;
    lastCheckAtRef.current = now;
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        await Updates.fetchUpdateAsync();
      }
    } catch {
      // Network / update-server errors are non-fatal: a later foreground check
      // or the next cold start picks the update up instead.
    }
  }, []);

  useEffect(() => {
    void checkAndFetch();
  }, [checkAndFetch]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkAndFetch();
    });
    return () => subscription.remove();
  }, [checkAndFetch]);

  const restart = useCallback(() => {
    void Updates.reloadAsync();
  }, []);

  // Dev-only escape hatch: a real OTA never becomes pending in a dev client, so
  // set EXPO_PUBLIC_FORCE_OTA_BANNER=true to force the restart prompt on screen
  // for visual verification. Guarded by __DEV__ — no effect in production.
  const forceBanner = __DEV__ && process.env.EXPO_PUBLIC_FORCE_OTA_BANNER === 'true';

  return { isRestartReady: isUpdatePending || forceBanner, restart };
}
