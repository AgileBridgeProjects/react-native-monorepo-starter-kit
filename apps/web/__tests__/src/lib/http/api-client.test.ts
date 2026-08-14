import { useWorkspaceStore } from '@store/workspace-store';
import { HttpResponse, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { server } from '@/test/mocks/server';

// ─── Mock the Supabase auth datasource the api-client uses ─────────────────────
// vi.hoisted ensures the factory runs before module imports so the mock is in
// place when api-client.ts is loaded and the interceptor is registered.
const mockGetIdToken = vi.hoisted(() =>
  vi.fn<(forceRefresh?: boolean) => Promise<string | undefined>>(),
);

// Mutable container so individual tests can swap the current user (e.g. sign-out
// mid-refresh or cross-user scenarios). Mirrors webAuthDatasource.getCurrentUser().
const mockAuth = vi.hoisted(() => ({
  currentUser: { id: 'test-uid' } as { id: string } | null,
}));

vi.mock('@features/auth/infrastructure/datasources/supabase-auth.datasource', () => ({
  webAuthDatasource: {
    getIdToken: mockGetIdToken,
    getCurrentUser: () => mockAuth.currentUser,
  },
}));

import { apiClient } from '@lib/http/api-client';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resetWorkspace() {
  useWorkspaceStore.setState({
    clubId: null,
    clubName: null,
    clubLogoUrl: null,
    teamId: null,
    teamName: null,
  });
}

/**
 * Captures the impersonation headers the interceptor sent for a single request
 * by registering an MSW handler at the given path and issuing a GET against it.
 */
async function captureImpersonationHeaders(path: string) {
  let clubHeader: string | null = 'initial';
  let teamHeader: string | null = 'initial';

  server.use(
    http.get(`*${path}`, ({ request }) => {
      clubHeader = request.headers.get('x-impersonate-club');
      teamHeader = request.headers.get('x-impersonate-team');
      return HttpResponse.json({ ok: true });
    }),
  );

  await apiClient.get(path);

  return { clubHeader, teamHeader };
}

describe('apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetWorkspace();
    // Restore the default authenticated user before each test.
    mockAuth.currentUser = { id: 'test-uid' };
  });

  describe('base configuration', () => {
    it('uses NEXT_PUBLIC_API_URL as the base URL when set', () => {
      expect(apiClient.defaults.baseURL).toBe(
        process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5002',
      );
    });

    it('does not set a default Content-Type header (allows axios to infer it per request)', () => {
      expect(apiClient.defaults.headers['Content-Type']).toBeUndefined();
    });
  });

  describe('request interceptor — auth token injection', () => {
    afterEach(() => {
      server.resetHandlers();
    });

    it('injects Authorization header when an id token is available', async () => {
      mockGetIdToken.mockResolvedValue('test-firebase-token');

      let capturedAuthHeader: string | null = null;
      server.use(
        http.get('*/api/test-auth', ({ request }) => {
          capturedAuthHeader = request.headers.get('authorization');
          return HttpResponse.json({ ok: true });
        }),
      );

      await apiClient.get('/api/test-auth');

      expect(capturedAuthHeader).toBe('Bearer test-firebase-token');
    });

    it('does not inject Authorization header when no token is available', async () => {
      mockGetIdToken.mockResolvedValue(undefined);

      let capturedAuthHeader: string | null = 'initial';
      server.use(
        http.get('*/api/test-no-auth', ({ request }) => {
          capturedAuthHeader = request.headers.get('authorization');
          return HttpResponse.json({ ok: true });
        }),
      );

      await apiClient.get('/api/test-no-auth');

      expect(capturedAuthHeader).toBeNull();
    });
  });

  describe('response interceptor — auth recovery', () => {
    afterEach(() => {
      server.resetHandlers();
    });

    it('retries once with a forced token refresh when the backend rejects the cached token', async () => {
      mockGetIdToken
        .mockResolvedValueOnce('stale-firebase-token')
        .mockResolvedValueOnce('fresh-firebase-token');

      const capturedAuthHeaders: Array<string | null> = [];
      let requestCount = 0;
      server.use(
        http.get('*/api/retry-auth', ({ request }) => {
          requestCount++;
          capturedAuthHeaders.push(request.headers.get('authorization'));

          if (requestCount === 1) {
            return HttpResponse.json({ title: 'Unauthorized' }, { status: 401 });
          }

          return HttpResponse.json({ ok: true });
        }),
      );

      const response = await apiClient.get('/api/retry-auth');

      expect(response.data).toEqual({ ok: true });
      expect(mockGetIdToken).toHaveBeenCalledTimes(2);
      expect(mockGetIdToken).toHaveBeenNthCalledWith(1);
      expect(mockGetIdToken).toHaveBeenNthCalledWith(2, true);
      expect(capturedAuthHeaders).toEqual([
        'Bearer stale-firebase-token',
        'Bearer fresh-firebase-token',
      ]);
    });

    it('shares one forced token refresh across concurrent backend 401 responses', async () => {
      mockGetIdToken.mockImplementation((forceRefresh?: boolean) =>
        Promise.resolve(forceRefresh ? 'fresh-firebase-token' : 'stale-firebase-token'),
      );

      const capturedAuthHeaders: Array<string | null> = [];
      let requestCount = 0;
      server.use(
        http.get('*/api/concurrent-auth', ({ request }) => {
          requestCount++;
          capturedAuthHeaders.push(request.headers.get('authorization'));

          if (requestCount <= 2) {
            return HttpResponse.json({ title: 'Unauthorized' }, { status: 401 });
          }

          return HttpResponse.json({ ok: true });
        }),
      );

      const [firstResponse, secondResponse] = await Promise.all([
        apiClient.get('/api/concurrent-auth'),
        apiClient.get('/api/concurrent-auth'),
      ]);

      expect(firstResponse.data).toEqual({ ok: true });
      expect(secondResponse.data).toEqual({ ok: true });
      expect(
        mockGetIdToken.mock.calls.filter(([forceRefresh]) => forceRefresh === true),
      ).toHaveLength(1);
      expect(capturedAuthHeaders).toEqual([
        'Bearer stale-firebase-token',
        'Bearer stale-firebase-token',
        'Bearer fresh-firebase-token',
        'Bearer fresh-firebase-token',
      ]);
    });

    it('surfaces the retry response error when forced token refresh succeeds but retry fails', async () => {
      mockGetIdToken
        .mockResolvedValueOnce('stale-firebase-token')
        .mockResolvedValueOnce('fresh-firebase-token');

      let requestCount = 0;
      server.use(
        http.get('*/api/retry-fails', () => {
          requestCount++;

          if (requestCount === 1) {
            return HttpResponse.json({ detail: 'Expired token' }, { status: 401 });
          }

          return HttpResponse.json({ detail: 'Retry failed' }, { status: 500 });
        }),
      );

      await expect(apiClient.get('/api/retry-fails')).rejects.toMatchObject({
        status: 500,
        message: 'Retry failed',
      });
    });

    it('surfaces the original 401 when the user signs out between 401 detection and token refresh', async () => {
      mockGetIdToken
        .mockResolvedValueOnce('stale-firebase-token')
        .mockImplementationOnce((forceRefresh) => {
          if (forceRefresh) {
            // Simulate sign-out completing while the forced refresh is in flight.
            mockAuth.currentUser = null;
          }
          return Promise.resolve('orphaned-fresh-token');
        });

      let requestCount = 0;
      server.use(
        http.get('*/api/user-signed-out', () => {
          requestCount++;
          return HttpResponse.json({ title: 'Unauthorized' }, { status: 401 });
        }),
      );

      await expect(apiClient.get('/api/user-signed-out')).rejects.toMatchObject({ status: 401 });
      // Retry must NOT have been attempted — only the initial 401 request.
      expect(requestCount).toBe(1);
    });

    it('surfaces the original 401 when a different user is active after the token refresh', async () => {
      mockGetIdToken
        .mockResolvedValueOnce('user-a-stale-token')
        .mockImplementationOnce((forceRefresh) => {
          if (forceRefresh) {
            // Simulate user switch completing while the refresh was in flight.
            mockAuth.currentUser = { id: 'user-b' };
          }
          return Promise.resolve('user-a-fresh-token');
        });

      let requestCount = 0;
      server.use(
        http.get('*/api/user-switched', () => {
          requestCount++;
          return HttpResponse.json({ title: 'Unauthorized' }, { status: 401 });
        }),
      );

      await expect(apiClient.get('/api/user-switched')).rejects.toMatchObject({ status: 401 });
      // Retry must NOT have been attempted with User A's token while User B is active.
      expect(requestCount).toBe(1);
    });
  });

  describe('request interceptor — impersonation header injection', () => {
    beforeEach(() => {
      // Auth token isn't relevant to these assertions; pin a value so the
      // auth-datasource mock doesn't return undefined and emit unrelated noise.
      mockGetIdToken.mockResolvedValue('test-auth-token');
    });

    afterEach(() => {
      server.resetHandlers();
    });

    it('omits both impersonation headers when no workspace is selected', async () => {
      const { clubHeader, teamHeader } = await captureImpersonationHeaders('/api/topics');

      expect(clubHeader).toBeNull();
      expect(teamHeader).toBeNull();
    });

    it('injects only X-Impersonate-Club when a club is selected without a team', async () => {
      useWorkspaceStore.setState({
        clubId: 'club-1',
        clubName: 'Acme Corp',
        clubLogoUrl: null,
        teamId: null,
        teamName: null,
      });

      const { clubHeader, teamHeader } = await captureImpersonationHeaders('/api/topics');

      expect(clubHeader).toBe('club-1');
      expect(teamHeader).toBeNull();
    });

    it('injects both impersonation headers when club and team are selected', async () => {
      useWorkspaceStore.setState({
        clubId: 'club-1',
        clubName: 'Acme Corp',
        clubLogoUrl: null,
        teamId: 'dept-1',
        teamName: 'Engineering',
      });

      const { clubHeader, teamHeader } = await captureImpersonationHeaders('/api/topics');

      expect(clubHeader).toBe('club-1');
      expect(teamHeader).toBe('dept-1');
    });

    it.each([
      '/api/clubs',
      '/api/teams',
      '/api/roles',
      '/api/auth',
    ])('sends impersonation headers to %s when workspace is active (backend decides via [AllowImpersonation])', async (path) => {
      useWorkspaceStore.setState({
        clubId: 'club-1',
        clubName: 'Acme Corp',
        clubLogoUrl: null,
        teamId: 'dept-1',
        teamName: 'Engineering',
      });

      const { clubHeader, teamHeader } = await captureImpersonationHeaders(path);

      expect(clubHeader).toBe('club-1');
      expect(teamHeader).toBe('dept-1');
    });
  });
});
