import { crashReporter } from '@lib/crash-reporting';
import NetInfo from '@react-native-community/netinfo';
import {
  type DefaultOptions,
  MutationCache,
  onlineManager,
  QueryCache,
  QueryClient,
} from '@tanstack/react-query';
import { Platform } from 'react-native';
import { ApiError } from './api-error';

// ─── Offline middleware ────────────────────────────────────────────────────────
// Wire React Query's onlineManager to NetInfo so that ALL queries are automatically
// paused (no API call, no skeleton) when the device is offline. Queries resume as
// soon as connectivity is restored.
//
// On web, React Query already uses navigator.onLine + browser events — no override needed.
// The EXPO_PUBLIC_FORCE_OFFLINE dev flag mirrors the useIsOnline hook behaviour.
if (Platform.OS !== 'web') {
  onlineManager.setEventListener((setOnline) => {
    if (__DEV__ && process.env.EXPO_PUBLIC_FORCE_OFFLINE === 'true') {
      setOnline(false);
      return () => {};
    }
    return NetInfo.addEventListener((state) => {
      setOnline(state.isInternetReachable ?? state.isConnected ?? true);
    });
  });
}

function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e));
}

function createQueryClient(overrides?: {
  queries?: DefaultOptions['queries'];
  mutations?: DefaultOptions['mutations'];
}): QueryClient {
  const { retry: retryOverride, ...otherQueryOverrides } = overrides?.queries ?? {};

  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => crashReporter.recordError(toError(error), { layer: 'query' }),
    }),
    mutationCache: new MutationCache({
      onError: (error) => crashReporter.recordError(toError(error), { layer: 'mutation' }),
    }),
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 10,
        retry:
          retryOverride ??
          ((failureCount, error) => {
            if (error instanceof ApiError) {
              if (error.isUnauthorized || error.isForbidden || error.isNotFound) {
                return false;
              }
            }
            return failureCount < 2;
          }),
        ...otherQueryOverrides,
      },
      mutations: {
        retry: false,
        ...overrides?.mutations,
      },
    },
  });
}

/**
 * Global React Query client.
 *
 * refetchOnWindowFocus is enabled on web — window focus events are meaningful in a browser and
 * ensure data (including SAS image URLs) is refreshed when users return to the tab.
 * It remains disabled on native where window focus events do not exist.
 */
export const queryClient = createQueryClient({
  queries: { refetchOnWindowFocus: Platform.OS === 'web' },
});
