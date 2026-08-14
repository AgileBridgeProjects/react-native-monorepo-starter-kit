import { userSetupDatasource } from '@features/auth/infrastructure/datasources/user-setup.datasource';
import { ApiError } from '@lib/http/api-error';
import { useAuthStore } from '@store/auth-store';
import { HttpResponse, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { server } from '@/test/mocks/server';

const BASE_URL = 'http://localhost:5001';
const VALIDATE_URL = `${BASE_URL}/api/users/setup/validate`;
const COMPLETE_URL = `${BASE_URL}/api/users/setup/complete`;
const RESET_REQUEST_URL = `${BASE_URL}/api/users/setup/password-reset/request`;
const CHANGE_PASSWORD_URL = `${BASE_URL}/api/users/me/change-password`;

function resetStore() {
  useAuthStore.setState({
    user: null,
    idToken: null,
    isAuthenticated: false,
    isResolvingOrg: false,
    activeClubId: null,
  });
}

beforeEach(resetStore);
afterEach(resetStore);

describe('userSetupDatasource.validateSetupToken', () => {
  it('returns the validation payload on success', async () => {
    server.use(
      http.get(VALIDATE_URL, () =>
        HttpResponse.json({ email: 'new@example.com', purpose: 'AccountSetup' }),
      ),
    );

    const result = await userSetupDatasource.validateSetupToken('tok-123');

    expect(result.email).toBe('new@example.com');
    expect(result.purpose).toBe('AccountSetup');
  });

  it('passes the token as a query param to GET /api/users/setup/validate', async () => {
    let token: string | null = null;
    let method: string | undefined;
    server.use(
      http.get(VALIDATE_URL, ({ request }) => {
        method = request.method;
        token = new URL(request.url).searchParams.get('token');
        return HttpResponse.json({ email: 'a@b.c', purpose: 'PasswordReset' });
      }),
    );

    await userSetupDatasource.validateSetupToken('tok-xyz');

    expect(method).toBe('GET');
    expect(token).toBe('tok-xyz');
  });

  it('throws an ApiError with the 400 status for an invalid/expired token', async () => {
    server.use(
      http.get(VALIDATE_URL, () =>
        HttpResponse.json({ message: 'Token expired' }, { status: 400 }),
      ),
    );

    await userSetupDatasource.validateSetupToken('bad').catch((err: ApiError) => {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(400);
      expect(err.message).toBe('Token expired');
    });
  });

  it('throws an ApiError with the 404 status when the token is unknown', async () => {
    server.use(http.get(VALIDATE_URL, () => HttpResponse.json({}, { status: 404 })));

    await userSetupDatasource.validateSetupToken('nope').catch((err: ApiError) => {
      expect(err.status).toBe(404);
      expect(err.isNotFound).toBeTruthy();
    });
  });
});

describe('userSetupDatasource.completeSetup', () => {
  it('posts the token and new password to /api/users/setup/complete', async () => {
    let body: { token?: string; newPassword?: string } = {};
    server.use(
      http.post(COMPLETE_URL, async ({ request }) => {
        body = (await request.json()) as typeof body;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await userSetupDatasource.completeSetup({ token: 'tok-1', newPassword: 'Secret123!' });

    expect(body).toEqual({ token: 'tok-1', newPassword: 'Secret123!' });
  });

  it('resolves to undefined on a 204 success', async () => {
    server.use(http.post(COMPLETE_URL, () => new HttpResponse(null, { status: 204 })));
    await expect(
      userSetupDatasource.completeSetup({ token: 't', newPassword: 'p' }),
    ).resolves.toBeUndefined();
  });

  it('throws an ApiError surfacing the validation message on a 422', async () => {
    server.use(
      http.post(COMPLETE_URL, () =>
        HttpResponse.json({ errors: { newPassword: ['Password is too weak'] } }, { status: 422 }),
      ),
    );

    await userSetupDatasource
      .completeSetup({ token: 't', newPassword: 'weak' })
      .catch((err: ApiError) => {
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(422);
        // ApiError pulls the first ValidationProblemDetails field error.
        expect(err.message).toBe('Password is too weak');
      });
  });
});

describe('userSetupDatasource.requestPasswordReset', () => {
  it('returns the reset link when the backend provides one (dev convenience)', async () => {
    server.use(
      http.post(RESET_REQUEST_URL, () =>
        HttpResponse.json({ resetLink: 'https://app/reset?token=abc' }),
      ),
    );

    const result = await userSetupDatasource.requestPasswordReset('user@example.com');

    expect(result).toBe('https://app/reset?token=abc');
  });

  it('returns null when the response omits a reset link', async () => {
    server.use(http.post(RESET_REQUEST_URL, () => HttpResponse.json({})));
    await expect(userSetupDatasource.requestPasswordReset('user@example.com')).resolves.toBeNull();
  });

  it('returns null when the endpoint replies 204 with no body', async () => {
    server.use(http.post(RESET_REQUEST_URL, () => new HttpResponse(null, { status: 204 })));
    await expect(userSetupDatasource.requestPasswordReset('user@example.com')).resolves.toBeNull();
  });

  it('posts the email to /api/users/setup/password-reset/request', async () => {
    let body: { email?: string } = {};
    server.use(
      http.post(RESET_REQUEST_URL, async ({ request }) => {
        body = (await request.json()) as typeof body;
        return HttpResponse.json({});
      }),
    );

    await userSetupDatasource.requestPasswordReset('user@example.com');

    expect(body.email).toBe('user@example.com');
  });

  it('throws an ApiError with the 429 status when rate-limited', async () => {
    server.use(
      http.post(RESET_REQUEST_URL, () =>
        HttpResponse.json({ message: 'Too many requests' }, { status: 429 }),
      ),
    );

    await userSetupDatasource.requestPasswordReset('user@example.com').catch((err: ApiError) => {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(429);
    });
  });
});

describe('userSetupDatasource.changePassword', () => {
  it('posts the new password to /api/users/me/change-password', async () => {
    let body: { newPassword?: string } = {};
    server.use(
      http.post(CHANGE_PASSWORD_URL, async ({ request }) => {
        body = (await request.json()) as typeof body;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await userSetupDatasource.changePassword('NewSecret123!');

    expect(body.newPassword).toBe('NewSecret123!');
  });

  it('resolves to undefined on a 204 success', async () => {
    server.use(http.post(CHANGE_PASSWORD_URL, () => new HttpResponse(null, { status: 204 })));
    await expect(userSetupDatasource.changePassword('p')).resolves.toBeUndefined();
  });

  it('throws an ApiError surfacing the server message on a 400', async () => {
    server.use(
      http.post(CHANGE_PASSWORD_URL, () =>
        HttpResponse.json({ message: 'Password reuse not allowed' }, { status: 400 }),
      ),
    );

    await userSetupDatasource.changePassword('reused').catch((err: ApiError) => {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(400);
      expect(err.message).toBe('Password reuse not allowed');
    });
  });
});
