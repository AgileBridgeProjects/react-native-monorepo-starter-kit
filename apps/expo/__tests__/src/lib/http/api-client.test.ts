import { apiClient } from '@lib/http/api-client';
import { ApiError } from '@lib/http/api-error';
import { authStoreUtils, useAuthStore } from '@store/auth-store';
import type { AuthUser } from '@starterkit/shared';
import { HttpResponse, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { server } from '@/test/mocks/server';

// api-client.ts defaults baseURL to http://localhost:5001 in tests.
const BASE_URL = 'http://localhost:5001';

// ─── Supabase mock (used by the 401 refresh path, imported lazily) ──────────────
// The 401 interceptor force-refreshes the Supabase session and reads the new
// access token off data.session (the old Firebase currentUser.getIdToken is gone).
const refreshSession = vi.hoisted(() => vi.fn());

vi.mock('@lib/supabase/config', () => ({
  supabase: {
    auth: {
      refreshSession: (...a: unknown[]) => refreshSession(...a),
    },
  },
}));

const fakeUser = { id: 'u1', email: 'a@b.com' } as unknown as AuthUser;

function setAuth(token: string | null, clubId: string | null = null) {
  useAuthStore.setState({
    user: fakeUser,
    idToken: token,
    isAuthenticated: Boolean(token),
    activeClubId: clubId,
  });
}

beforeEach(() => {
  useAuthStore.getState().logout();
  refreshSession.mockReset();
  // Default: no session returned, so the 401 path falls through to logout unless
  // a test opts into a successful refresh.
  refreshSession.mockResolvedValue({ data: { session: null }, error: null });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Request interceptor ────────────────────────────────────────────────────────

describe('apiClient request interceptor', () => {
  it('attaches a Bearer Authorization header from the auth store', async () => {
    setAuth('tok-123');
    let seen: string | null = null;
    server.use(
      http.get(`${BASE_URL}/ping`, ({ request }) => {
        seen = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      }),
    );

    await apiClient.get('/ping');

    expect(seen).toBe('Bearer tok-123');
  });

  it('omits the Authorization header when no token is present', async () => {
    setAuth(null);
    let seen: string | null = 'unset';
    server.use(
      http.get(`${BASE_URL}/ping`, ({ request }) => {
        seen = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      }),
    );

    await apiClient.get('/ping');

    expect(seen).toBeNull();
  });

  it('attaches the X-Active-Org header when an active org is set', async () => {
    setAuth('tok', 'org-9');
    let seen: string | null = null;
    server.use(
      http.get(`${BASE_URL}/ping`, ({ request }) => {
        seen = request.headers.get('X-Active-Org');
        return HttpResponse.json({ ok: true });
      }),
    );

    await apiClient.get('/ping');

    expect(seen).toBe('org-9');
  });

  it('omits X-Active-Org when no active org is selected', async () => {
    setAuth('tok', null);
    let seen: string | null = 'unset';
    server.use(
      http.get(`${BASE_URL}/ping`, ({ request }) => {
        seen = request.headers.get('X-Active-Org');
        return HttpResponse.json({ ok: true });
      }),
    );

    await apiClient.get('/ping');

    expect(seen).toBeNull();
  });

  it('drops the JSON Content-Type for FormData bodies so axios sets multipart', async () => {
    setAuth('tok');
    let contentType: string | null = null;
    server.use(
      http.post(`${BASE_URL}/upload`, ({ request }) => {
        contentType = request.headers.get('Content-Type');
        return HttpResponse.json({ ok: true });
      }),
    );

    const form = new FormData();
    form.append('field', 'value');
    await apiClient.post('/upload', form);

    expect(contentType).not.toBe('application/json');
  });
});

// ─── Response interceptor: error mapping ────────────────────────────────────────

describe('apiClient response interceptor — error mapping', () => {
  it('maps a non-401 error response to an ApiError', async () => {
    server.use(
      http.get(`${BASE_URL}/forbidden`, () =>
        HttpResponse.json({ message: 'No access', code: 'F' }, { status: 403 }),
      ),
    );

    await expect(apiClient.get('/forbidden')).rejects.toBeInstanceOf(ApiError);
    await apiClient.get('/forbidden').catch((err: ApiError) => {
      expect(err.status).toBe(403);
      expect(err.isForbidden).toBeTruthy();
      expect(err.message).toBe('No access');
    });
  });

  it('maps a network error (no response) to a status-0 ApiError', async () => {
    server.use(http.get(`${BASE_URL}/down`, () => HttpResponse.error()));

    await apiClient.get('/down').catch((err: ApiError) => {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(0);
      expect(err.isNetworkError).toBeTruthy();
    });
  });
});

// ─── Response interceptor: 401 refresh + retry ──────────────────────────────────

describe('apiClient response interceptor — 401 refresh & retry', () => {
  it('refreshes the Supabase session on 401, retries with the new token, and persists it', async () => {
    setAuth('stale-token');
    refreshSession.mockResolvedValue({
      data: { session: { access_token: 'fresh-token' } },
      error: null,
    });

    const authHeaders: Array<string | null> = [];
    server.use(
      http.get(`${BASE_URL}/secure`, ({ request }) => {
        const auth = request.headers.get('Authorization');
        authHeaders.push(auth);
        if (auth === 'Bearer stale-token') {
          return HttpResponse.json({ message: 'expired' }, { status: 401 });
        }
        return HttpResponse.json({ ok: true });
      }),
    );

    const res = await apiClient.get('/secure');

    expect(res.data).toEqual({ ok: true });
    expect(refreshSession).toHaveBeenCalled();
    // First attempt stale, retry carries the refreshed token.
    expect(authHeaders).toContain('Bearer stale-token');
    expect(authHeaders).toContain('Bearer fresh-token');
    // New token persisted back into the store.
    expect(authStoreUtils.getIdToken()).toBe('fresh-token');
  });

  it('triggers logout and rejects when the refresh returns no Supabase session', async () => {
    setAuth('stale-token');
    refreshSession.mockResolvedValue({ data: { session: null }, error: null });
    const logoutSpy = vi.spyOn(authStoreUtils, 'triggerLogout');

    server.use(
      http.get(`${BASE_URL}/secure`, () =>
        HttpResponse.json({ message: 'expired' }, { status: 401 }),
      ),
    );

    await expect(apiClient.get('/secure')).rejects.toBeInstanceOf(ApiError);
    expect(logoutSpy).toHaveBeenCalled();
  });

  it('triggers logout and rejects when the session refresh itself fails', async () => {
    setAuth('stale-token');
    refreshSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'refresh failed' },
    });
    const logoutSpy = vi.spyOn(authStoreUtils, 'triggerLogout');

    server.use(
      http.get(`${BASE_URL}/secure`, () =>
        HttpResponse.json({ message: 'expired' }, { status: 401 }),
      ),
    );

    await expect(apiClient.get('/secure')).rejects.toBeInstanceOf(ApiError);
    expect(logoutSpy).toHaveBeenCalled();
  });

  it('does not attempt a second refresh for an already-retried request (no infinite loop)', async () => {
    setAuth('stale-token');
    refreshSession.mockResolvedValue({
      data: { session: { access_token: 'still-stale' } },
      error: null,
    });

    let count = 0;
    server.use(
      http.get(`${BASE_URL}/secure`, () => {
        count += 1;
        return HttpResponse.json({ message: 'expired' }, { status: 401 });
      }),
    );

    await expect(apiClient.get('/secure')).rejects.toBeInstanceOf(ApiError);
    // original request + exactly one retry, then it gives up (no loop).
    expect(count).toBe(2);
    // refresh only attempted once.
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });
});
