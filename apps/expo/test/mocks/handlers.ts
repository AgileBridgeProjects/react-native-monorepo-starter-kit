import { HttpResponse, http } from 'msw';

import { makeAuthResponseDto, makeRefreshResponseDto, makeUserDto } from '../factories';

// Re-export factory-created defaults so handler consumers get consistent fixtures
export const mockUserDto = makeUserDto();
export const mockAuthResponse = makeAuthResponseDto();
export const mockRefreshResponse = makeRefreshResponseDto();

// ─── Base URL ────────────────────────────────────────────────────────────────

const BASE_URL = 'http://localhost:3000';

// ─── Handlers ────────────────────────────────────────────────────────────────

export const handlers = [
  // POST /auth/login
  http.post(`${BASE_URL}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };

    if (body.email === 'invalid@example.com') {
      return HttpResponse.json(
        { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
        { status: 401 },
      );
    }

    return HttpResponse.json(mockAuthResponse);
  }),

  // POST /auth/register
  http.post(`${BASE_URL}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as { email?: string };

    if (body.email === 'taken@example.com') {
      return HttpResponse.json(
        { message: 'Email already in use', code: 'EMAIL_CONFLICT' },
        { status: 409 },
      );
    }

    return HttpResponse.json(mockAuthResponse);
  }),

  // POST /auth/logout
  http.post(`${BASE_URL}/auth/logout`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /auth/refresh
  http.post(`${BASE_URL}/auth/refresh`, async ({ request }) => {
    const body = (await request.json()) as { refresh_token?: string };

    if (body.refresh_token === 'expired-token') {
      return HttpResponse.json(
        { message: 'Refresh token expired', code: 'TOKEN_EXPIRED' },
        { status: 401 },
      );
    }

    return HttpResponse.json(mockRefreshResponse);
  }),

  // GET /auth/me
  http.get(`${BASE_URL}/auth/me`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    return HttpResponse.json(mockUserDto);
  }),
];
