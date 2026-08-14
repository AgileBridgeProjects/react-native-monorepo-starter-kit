import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

import { Platform } from 'react-native';

import { resolveDevLanUrl } from '@/src/lib/dev-lan-host';
import { ApiError } from './api-error';

/**
 * Singleton axios instance used by all datasources.
 *
 * Base URL is read from the EXPO_PUBLIC_API_URL environment variable.
 * Set this in your .env.local file:
 *   EXPO_PUBLIC_API_URL=https://api.yourdomain.com
 *
 * Request interceptor:  attaches the Bearer token from the auth store.
 * Response interceptor: attempts a Supabase session refresh on 401 before triggering logout.
 */

// `resolveDevLanUrl`: in a local dev bundle only, and only when this names a localhost/LAN IP,
// swap in the host Metro was actually reached on. A changed DHCP lease otherwise leaves this
// pointing at an address nobody owns, and every request hangs with no error. No-op in every
// release build — see the helper's remarks.
const configuredUrl = resolveDevLanUrl(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5001');

// On web the browser enforces CORS, so always use localhost to match the
// server's allowed-origin list.  Native clients are unaffected by CORS and
// must use the LAN IP so the device can reach the dev machine.
const API_BASE_URL =
  Platform.OS === 'web' ? configuredUrl.replace(/\/\/[\d.]+:/, '//localhost:') : configuredUrl;

// Fail fast if API URL is not configured in production
if (!process.env.EXPO_PUBLIC_API_URL && typeof __DEV__ !== 'undefined' && !__DEV__) {
  throw new Error('EXPO_PUBLIC_API_URL environment variable is required in production builds.');
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * The dev auth bypass (see AuthInitializer) seeds a fake `dev-bypass-token` that
 * the API always rejects with 401. Attempting a Supabase refresh for it can never
 * succeed, so the retry/logout path below is skipped entirely — otherwise every
 * request spins request → 401 → refresh → logout → retry forever.
 */
const IS_DEV_AUTH_BYPASS = __DEV__ && process.env.EXPO_PUBLIC_BYPASS_AUTH === 'true';

// Lazily imported to avoid a circular dependency with the store at module load
// time, but memoised: these interceptors run on *every* request, and an un-cached
// dynamic import re-requests the chunk from Metro under dev lazy bundling, which
// flashes the "Refreshing" banner in Expo Go on each call.
let authStorePromise: Promise<typeof import('@store/auth-store')> | null = null;
function loadAuthStore(): Promise<typeof import('@store/auth-store')> {
  authStorePromise ??= import('@store/auth-store');
  return authStorePromise;
}

let supabasePromise: Promise<typeof import('@lib/supabase/config')> | null = null;
function loadSupabase(): Promise<typeof import('@lib/supabase/config')> {
  supabasePromise ??= import('@lib/supabase/config');
  return supabasePromise;
}

// ─── Request Interceptor ─────────────────────────────────────────────────────

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const { authStoreUtils } = await loadAuthStore();
    // Attach the current access token from the auth store when available
    const token = authStoreUtils.getIdToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Send the active org so the backend resolves the correct tenant for multi-org users
    const activeClubId = authStoreUtils.getActiveClubId();
    if (activeClubId) {
      config.headers['X-Active-Org'] = activeClubId;
    }
    // For FormData requests, remove the default application/json Content-Type so
    // axios can set multipart/form-data with the correct boundary automatically.
    if (config.data instanceof FormData) {
      config.headers.delete('Content-Type');
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Token Refresh ───────────────────────────────────────────────────────────

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  for (const { resolve, reject } of failedQueue) {
    if (error) {
      reject(error);
    } else {
      resolve(token as string);
    }
  }
  failedQueue = [];
}

// ─── Response Interceptor ────────────────────────────────────────────────────

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const apiError = ApiError.fromAxiosError(error);
    const originalRequest = error.config as RetryableConfig | undefined;

    // Under the dev auth bypass the token is fake by design — never try to refresh
    // it, and never force a logout that would remount the tree and start again.
    if (IS_DEV_AUTH_BYPASS) {
      return Promise.reject(apiError);
    }

    if (apiError.isUnauthorized && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Force-refresh the Supabase session to obtain a fresh access token.
        const { supabase } = await loadSupabase();
        const { data, error: refreshError } = await supabase.auth.refreshSession();

        const newToken = data.session?.access_token;
        if (refreshError || !newToken) {
          throw refreshError ?? new Error('No authenticated Supabase session');
        }

        const { useAuthStore } = await loadAuthStore();
        const state = useAuthStore.getState();
        if (state.user) {
          state.setAuth(state.user, newToken);
        }

        isRefreshing = false;
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null);

        const { authStoreUtils } = await loadAuthStore();
        authStoreUtils.triggerLogout();

        return Promise.reject(apiError);
      }
    }

    return Promise.reject(apiError);
  },
);
