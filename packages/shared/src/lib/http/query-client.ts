import { type DefaultOptions, QueryClient } from '@tanstack/react-query';

import { ApiError } from './api-error';

/**
 * Creates a configured React Query client.
 * Each app can call this factory to get a client with shared defaults.
 *
 * Retry policy:
 *  - Never retry 401/403/404 — these are deterministic failures.
 *  - Retry all other errors up to 2 times (network blips, 5xx transients).
 *
 * @param overrides - Optional per-app overrides merged on top of the shared defaults.
 *   All fields in `overrides.queries` are merged, except `retry` is handled
 *   explicitly: if you pass a `retry` value it fully replaces the shared retry
 *   function (including the 401/403/404 guard).  Omit `retry` to keep the
 *   shared behaviour and only override other fields (e.g. `refetchOnWindowFocus`).
 */
export function createQueryClient(overrides?: {
  queries?: DefaultOptions['queries'];
  mutations?: DefaultOptions['mutations'];
}): QueryClient {
  const { retry: retryOverride, ...otherQueryOverrides } = overrides?.queries ?? {};

  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 min — data considered fresh
        gcTime: 1000 * 60 * 10, // 10 min — inactive cache kept in memory
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
