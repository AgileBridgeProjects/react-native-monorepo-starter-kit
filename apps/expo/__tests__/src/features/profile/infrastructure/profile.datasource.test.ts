import { ProfileDataSource } from '@features/profile/infrastructure/profile.datasource';
import { ApiError } from '@lib/http/api-error';
import { HttpResponse, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeUserProfile } from '@/test/factories/profile.factory';
import { server } from '@/test/mocks/server';

const BASE_URL = 'http://localhost:5001';

const datasource = new ProfileDataSource();

let requestedUrls: string[];
let requestedMethods: string[];

beforeEach(() => {
  requestedUrls = [];
  requestedMethods = [];
  server.events.on('request:start', ({ request }) => {
    requestedUrls.push(new URL(request.url).pathname);
    requestedMethods.push(request.method);
  });
});

afterEach(() => {
  server.events.removeAllListeners();
  vi.restoreAllMocks();
});

// ─── getProfile ────────────────────────────────────────────────────────────────

describe('ProfileDataSource.getProfile', () => {
  it('GETs /api/users/me/profile and passes a production HTTPS avatar URL through', async () => {
    const profile = makeUserProfile({
      avatarUrl: 'https://cdn.azure.com/avatars/me.jpg',
    });
    server.use(http.get(`${BASE_URL}/api/users/me/profile`, () => HttpResponse.json(profile)));

    const result = await datasource.getProfile();

    expect(result.displayName).toBe('Alex Johnson');
    expect(result.avatarUrl).toBe('https://cdn.azure.com/avatars/me.jpg');
    expect(requestedUrls).toContain('/api/users/me/profile');
    expect(requestedMethods).toContain('GET');
  });

  it('nulls out an unreachable localhost (Azurite) avatar URL', async () => {
    server.use(
      http.get(`${BASE_URL}/api/users/me/profile`, () =>
        HttpResponse.json(makeUserProfile({ avatarUrl: 'http://localhost:10000/blob/me.jpg' })),
      ),
    );

    const result = await datasource.getProfile();
    expect(result.avatarUrl).toBeNull();
  });

  it('nulls out a raw blob path that has no http prefix', async () => {
    server.use(
      http.get(`${BASE_URL}/api/users/me/profile`, () =>
        HttpResponse.json(makeUserProfile({ avatarUrl: 'avatars/me.jpg' })),
      ),
    );

    const result = await datasource.getProfile();
    expect(result.avatarUrl).toBeNull();
  });

  it('keeps a null avatar URL as null', async () => {
    server.use(
      http.get(`${BASE_URL}/api/users/me/profile`, () =>
        HttpResponse.json(makeUserProfile({ avatarUrl: null })),
      ),
    );

    const result = await datasource.getProfile();
    expect(result.avatarUrl).toBeNull();
  });

  it('rejects with an ApiError carrying status 500 on a server error', async () => {
    server.use(
      http.get(`${BASE_URL}/api/users/me/profile`, () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    );

    await expect(datasource.getProfile()).rejects.toBeInstanceOf(ApiError);
    await expect(datasource.getProfile()).rejects.toMatchObject({ status: 500 });
  });

  it('rejects with an ApiError carrying status 401 when unauthenticated', async () => {
    server.use(
      http.get(`${BASE_URL}/api/users/me/profile`, () =>
        HttpResponse.json({ message: 'no' }, { status: 401 }),
      ),
    );

    await expect(datasource.getProfile()).rejects.toMatchObject({ status: 401 });
  });
});

// ─── updateProfile ───────────────────────────────────────────────────────────--

describe('ProfileDataSource.updateProfile', () => {
  it('PATCHes /api/users/me/profile with the display-name payload and resolves on 204', async () => {
    let capturedBody: unknown;
    server.use(
      http.patch(`${BASE_URL}/api/users/me/profile`, async ({ request }) => {
        capturedBody = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await datasource.updateProfile({ displayName: 'New Name' });

    expect(requestedUrls).toContain('/api/users/me/profile');
    expect(requestedMethods).toContain('PATCH');
    expect(capturedBody).toEqual({ displayName: 'New Name' });
  });

  it('sends the removeAvatar flag when removing the avatar', async () => {
    let capturedBody: unknown;
    server.use(
      http.patch(`${BASE_URL}/api/users/me/profile`, async ({ request }) => {
        capturedBody = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await datasource.updateProfile({ removeAvatar: true });
    expect(capturedBody).toEqual({ removeAvatar: true });
  });

  it('rejects with an ApiError carrying status 400 on a validation failure', async () => {
    server.use(
      http.patch(`${BASE_URL}/api/users/me/profile`, () =>
        HttpResponse.json({ message: 'Name too long' }, { status: 400 }),
      ),
    );

    await expect(datasource.updateProfile({ displayName: 'x'.repeat(200) })).rejects.toMatchObject({
      status: 400,
    });
  });
});

// ─── uploadAvatar ──────────────────────────────────────────────────────────────
// uploadAvatar uses raw XMLHttpRequest (not axios) and dynamically imports the
// auth store + supabase config. We stub a controllable XHR + those modules so the
// status/retry/parse branches are exercised without a real network or native FormData.
// On a 401 the datasource refreshes via `supabase.auth.refreshSession()` (the old
// Firebase `currentUser.getIdToken(true)` refresh is gone).

type XhrInstance = {
  open: ReturnType<typeof vi.fn>;
  setRequestHeader: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  ontimeout: (() => void) | null;
  status: number;
  responseText: string;
  timeout: number;
};

let xhrInstances: XhrInstance[];

function installXhrMock(responses: Array<{ status: number; body: string }>) {
  xhrInstances = [];
  let callIndex = 0;
  class FakeXhr {
    open = vi.fn();
    setRequestHeader = vi.fn();
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    ontimeout: (() => void) | null = null;
    status = 0;
    responseText = '';
    timeout = 0;
    send = vi.fn(() => {
      const response = responses[callIndex] ?? responses[responses.length - 1];
      callIndex += 1;
      this.status = response.status;
      this.responseText = response.body;
      // Resolve asynchronously to mirror the real XHR event loop.
      queueMicrotask(() => this.onload?.());
    });
  }
  vi.stubGlobal(
    'XMLHttpRequest',
    vi.fn(() => {
      const xhr = new FakeXhr() as unknown as XhrInstance;
      xhrInstances.push(xhr);
      return xhr;
    }),
  );
}

const NATIVE_FILE = { uri: 'file:///tmp/avatar.jpg', name: 'avatar.jpg', type: 'image/jpeg' };

describe('ProfileDataSource.uploadAvatar', () => {
  beforeEach(() => {
    vi.doMock('@store/auth-store', () => ({
      authStoreUtils: { getIdToken: () => 'token-abc' },
      useAuthStore: { getState: () => ({ user: null, setAuth: vi.fn() }) },
    }));
    // Default: refresh yields no session, so the 401-retry path is a no-op unless
    // a test overrides this mock.
    vi.doMock('@lib/supabase/config', () => ({
      supabase: {
        auth: { refreshSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
      },
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock('@store/auth-store');
    vi.doUnmock('@lib/supabase/config');
    vi.resetModules();
  });

  it('POSTs to /api/users/me/avatar with the bearer token and resolves the resolved blob URL', async () => {
    installXhrMock([
      {
        status: 200,
        body: JSON.stringify({ avatarBlobPath: 'p/me.jpg', avatarUrl: 'https://cdn/x.jpg' }),
      },
    ]);
    const { ProfileDataSource: FreshDS } = await import(
      '@features/profile/infrastructure/profile.datasource'
    );
    const ds = new FreshDS();

    const result = await ds.uploadAvatar(NATIVE_FILE);

    expect(result.avatarBlobPath).toBe('p/me.jpg');
    expect(result.avatarUrl).toBe('https://cdn/x.jpg');
    const xhr = xhrInstances[0];
    expect(xhr.open).toHaveBeenCalledWith('POST', `${BASE_URL}/api/users/me/avatar`);
    expect(xhr.setRequestHeader).toHaveBeenCalledWith('Authorization', 'Bearer token-abc');
  });

  it('falls back to the raw avatarUrl when resolveBlobUrl returns a localhost URL', async () => {
    installXhrMock([
      {
        status: 201,
        body: JSON.stringify({ avatarBlobPath: 'p', avatarUrl: 'http://localhost:10000/x.jpg' }),
      },
    ]);
    const { ProfileDataSource: FreshDS } = await import(
      '@features/profile/infrastructure/profile.datasource'
    );
    const result = await new FreshDS().uploadAvatar(NATIVE_FILE);
    // resolveBlobUrl → null for localhost, so the code keeps the raw response URL.
    expect(result.avatarUrl).toBe('http://localhost:10000/x.jpg');
  });

  it('throws an ApiError with the server message on a non-2xx JSON response', async () => {
    installXhrMock([{ status: 413, body: JSON.stringify({ message: 'File too large' }) }]);
    const { ProfileDataSource: FreshDS } = await import(
      '@features/profile/infrastructure/profile.datasource'
    );
    const { ApiError: FreshApiError } = await import('@lib/http/api-error');

    await expect(new FreshDS().uploadAvatar(NATIVE_FILE)).rejects.toBeInstanceOf(FreshApiError);
    await expect(new FreshDS().uploadAvatar(NATIVE_FILE)).rejects.toMatchObject({
      status: 413,
      message: 'File too large',
    });
  });

  it('uses the first field error from ValidationProblemDetails when no message present', async () => {
    installXhrMock([
      { status: 400, body: JSON.stringify({ errors: { File: ['Unsupported type'] } }) },
    ]);
    const { ProfileDataSource: FreshDS } = await import(
      '@features/profile/infrastructure/profile.datasource'
    );
    await expect(new FreshDS().uploadAvatar(NATIVE_FILE)).rejects.toMatchObject({
      status: 400,
      message: 'Unsupported type',
    });
  });

  it('falls back to a default message when the error body is not JSON', async () => {
    installXhrMock([{ status: 500, body: '<html>error</html>' }]);
    const { ProfileDataSource: FreshDS } = await import(
      '@features/profile/infrastructure/profile.datasource'
    );
    await expect(new FreshDS().uploadAvatar(NATIVE_FILE)).rejects.toMatchObject({
      status: 500,
      message: 'Upload failed (500)',
    });
  });

  it('wraps a network failure in an ApiError with status 0', async () => {
    xhrInstances = [];
    class FailingXhr {
      open = vi.fn();
      setRequestHeader = vi.fn();
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      ontimeout: (() => void) | null = null;
      status = 0;
      responseText = '';
      timeout = 0;
      send = vi.fn(() => {
        queueMicrotask(() => this.onerror?.());
      });
    }
    vi.stubGlobal(
      'XMLHttpRequest',
      vi.fn(() => new FailingXhr()),
    );
    const { ProfileDataSource: FreshDS } = await import(
      '@features/profile/infrastructure/profile.datasource'
    );
    await expect(new FreshDS().uploadAvatar(NATIVE_FILE)).rejects.toMatchObject({
      status: 0,
      message: 'Network request failed',
    });
  });

  it('retries once with a refreshed Supabase token on a 401, then succeeds', async () => {
    installXhrMock([
      { status: 401, body: JSON.stringify({ message: 'expired' }) },
      {
        status: 200,
        body: JSON.stringify({ avatarBlobPath: 'p', avatarUrl: 'https://cdn/y.jpg' }),
      },
    ]);
    const refreshSessionSpy = vi
      .fn()
      .mockResolvedValue({ data: { session: { access_token: 'fresh-token' } } });
    const setAuthSpy = vi.fn();
    vi.doMock('@store/auth-store', () => ({
      authStoreUtils: { getIdToken: () => 'stale-token' },
      useAuthStore: { getState: () => ({ user: { id: 'u1' }, setAuth: setAuthSpy }) },
    }));
    vi.doMock('@lib/supabase/config', () => ({
      supabase: { auth: { refreshSession: refreshSessionSpy } },
    }));

    const { ProfileDataSource: FreshDS } = await import(
      '@features/profile/infrastructure/profile.datasource'
    );
    const result = await new FreshDS().uploadAvatar(NATIVE_FILE);

    expect(refreshSessionSpy).toHaveBeenCalled();
    expect(setAuthSpy).toHaveBeenCalledWith({ id: 'u1' }, 'fresh-token');
    expect(result.avatarUrl).toBe('https://cdn/y.jpg');
    // Second request carries the refreshed token.
    expect(xhrInstances[1].setRequestHeader).toHaveBeenCalledWith(
      'Authorization',
      'Bearer fresh-token',
    );
  });

  it('throws the original 401 ApiError when the Supabase session cannot be refreshed', async () => {
    installXhrMock([{ status: 401, body: JSON.stringify({ message: 'expired' }) }]);
    // Default beforeEach mock already returns { session: null } → no retry.
    const { ProfileDataSource: FreshDS } = await import(
      '@features/profile/infrastructure/profile.datasource'
    );
    await expect(new FreshDS().uploadAvatar(NATIVE_FILE)).rejects.toMatchObject({ status: 401 });
  });
});
