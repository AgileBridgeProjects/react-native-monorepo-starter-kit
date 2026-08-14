import { webAuthDatasource } from '@features/auth/infrastructure/datasources/supabase-auth.datasource';
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useWorkspaceStore } from '@/store/workspace-store';

import { ApiError } from './api-error';
import { API_BASE_URL } from './api-url';

interface AuthRetryConfig extends InternalAxiosRequestConfig {
  _authRetry?: boolean;
}

// Keyed by Supabase user id so concurrent 401s from the same user share one
// refresh call, while a user switch never reuses a stale user's in-flight
// promise. Reads the cached in-memory user (sync) — no network round-trip.
const authRefreshPromises = new Map<string, Promise<string | null>>();

/** Cached user id from the in-memory session, or null when signed out. */
function currentUserId(): string | null {
  return webAuthDatasource.getCurrentUser()?.id ?? null;
}

/**
 * Shared axios instance for the web app. All generated proxy functions delegate here
 * via the custom Orval mutator, ensuring a single base URL and default headers.
 *
 * Interceptors (auth token injection, error normalisation) are configured below.
 *
 * Note: `Content-Type: application/json` is intentionally omitted here. Axios sets it
 * automatically for JSON payloads and correctly uses `multipart/form-data` (with boundary)
 * when sending FormData (e.g. file uploads). A blanket default would override that and
 * break multipart requests.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  // Serialize arrays as repeated bare keys (url=a&url=b) rather than the
  // bracket format (url[]=a&url[]=b). ASP.NET Core [FromQuery] array binding
  // expects the bare-key format — brackets are not recognised as the same param.
  paramsSerializer: { indexes: null },
});

// ─── Request Interceptor: Inject Supabase access token ──────────────────────
//
// Always resolve the token via the datasource rather than reading a cached
// value from the Zustand store. supabase-js transparently refreshes the token
// when it is close to expiry (autoRefreshToken), so getIdToken() returns a
// valid access token on every request without manual refresh logic here.

apiClient.interceptors.request.use(async (config) => {
  // Inject the Supabase access token when a session exists.
  // Whether a token is actually required is enforced by [Authorize]/[AllowAnonymous]
  // on the backend — the frontend does not maintain a duplicate list of public paths.
  const authRetryConfig = config as typeof config & AuthRetryConfig;
  if (!authRetryConfig._authRetry) {
    const idToken = await webAuthDatasource.getIdToken();
    if (idToken) {
      config.headers.Authorization = `Bearer ${idToken}`;
    }
  }

  // ─── Impersonation headers ────────────────────────────────────────────────
  // Inject workspace context when a SuperAdmin has selected a club/team.
  // useWorkspaceStore.getState() is safe to call outside React — Zustand stores
  // expose getState() for non-hook access (e.g. axios interceptors).
  //
  // Headers are sent on every request. The backend's ImpersonationMiddleware
  // decides whether to apply them based on whether the target endpoint is
  // decorated with [AllowImpersonation]. Endpoints without that attribute
  // silently ignore these headers, giving cross-tenant access automatically.
  const { clubId, teamId } = useWorkspaceStore.getState();
  if (clubId) {
    config.headers['X-Impersonate-Club'] = clubId;
    if (teamId) {
      config.headers['X-Impersonate-Team'] = teamId;
    }
  }

  return config;
});

// ─── Response Interceptor: Normalise errors into ApiError ───────────────────
//
// Converts every non-2xx AxiosError into a typed ApiError so consuming code
// can rely on `error instanceof ApiError` for branching (isConflict, code, etc.).

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const retryConfig = error.config as AuthRetryConfig | undefined;
    const userId = currentUserId();

    if (error.response?.status === 401 && retryConfig && userId && !retryConfig._authRetry) {
      let idToken: string | null = null;
      try {
        // Concurrent 401s from the same user share one force-refresh call.
        if (!authRefreshPromises.has(userId)) {
          authRefreshPromises.set(
            userId,
            webAuthDatasource.getIdToken(true).finally(() => {
              authRefreshPromises.delete(userId);
            }),
          );
        }

        idToken = (await authRefreshPromises.get(userId)) ?? null;
      } catch {
        // Fall through to the normalized original 401.
      }

      if (idToken) {
        // Guard: if the user signed out or switched between 401 detection and the
        // refresh completing, the refreshed token belongs to a different (or no)
        // session — abort the retry instead of sending an orphaned credential.
        if (currentUserId() !== userId) {
          return Promise.reject(ApiError.fromAxiosError(error));
        }

        retryConfig._authRetry = true;
        retryConfig.headers.set('Authorization', `Bearer ${idToken}`);
        return apiClient.request(retryConfig);
      }
    }

    return Promise.reject(ApiError.fromAxiosError(error));
  },
);
