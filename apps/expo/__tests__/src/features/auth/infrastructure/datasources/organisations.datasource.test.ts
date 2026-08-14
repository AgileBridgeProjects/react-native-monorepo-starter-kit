import { organisationsDatasource } from '@features/auth/infrastructure/datasources/organisations.datasource';
import { ApiError } from '@lib/http/api-error';
import { useAuthStore } from '@store/auth-store';
import { HttpResponse, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { makeLinkedOrg } from '@/test/factories/auth.factory';
import { server } from '@/test/mocks/server';

// api-client resolves EXPO_PUBLIC_API_URL to this default when the var is unset (test env).
const BASE_URL = 'http://localhost:5001';
const ORGS_URL = `${BASE_URL}/api/auth/me/organisations`;

function resetStore() {
  useAuthStore.setState({
    user: null,
    idToken: null,
    isAuthenticated: false,
    isResolvingOrg: false,
    activeClubId: null,
  });
}

describe('organisationsDatasource.getLinkedOrganisations', () => {
  beforeEach(resetStore);
  afterEach(resetStore);

  it('returns the linked organisations on a 200 response', async () => {
    const orgs = [
      makeLinkedOrg({ clubId: 'c-1', clubName: 'Acme' }),
      makeLinkedOrg({ clubId: 'c-2', clubName: 'Globex' }),
    ];
    server.use(http.get(ORGS_URL, () => HttpResponse.json(orgs)));

    const result = await organisationsDatasource.getLinkedOrganisations();

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ clubId: 'c-1', clubName: 'Acme' });
  });

  it('returns an empty array when the user has no linked organisations', async () => {
    server.use(http.get(ORGS_URL, () => HttpResponse.json([])));
    await expect(organisationsDatasource.getLinkedOrganisations()).resolves.toEqual([]);
  });

  it('requests GET /api/auth/me/organisations with the bearer token from the auth store', async () => {
    useAuthStore.getState().setAuth({ id: 'u1', email: 'a@b.c', name: 'A' }, 'token-abc');
    let captured: { method?: string; auth?: string | null } = {};
    server.use(
      http.get(ORGS_URL, ({ request }) => {
        captured = { method: request.method, auth: request.headers.get('Authorization') };
        return HttpResponse.json([]);
      }),
    );

    await organisationsDatasource.getLinkedOrganisations();

    expect(captured.method).toBe('GET');
    expect(captured.auth).toBe('Bearer token-abc');
  });

  it('sends the X-Active-Org header when an org is selected', async () => {
    useAuthStore.getState().setAuth({ id: 'u1', email: 'a@b.c', name: 'A' }, 'token-abc');
    useAuthStore.getState().setActiveOrg('active-co');
    let activeOrg: string | null = null;
    server.use(
      http.get(ORGS_URL, ({ request }) => {
        activeOrg = request.headers.get('X-Active-Org');
        return HttpResponse.json([]);
      }),
    );

    await organisationsDatasource.getLinkedOrganisations();

    expect(activeOrg).toBe('active-co');
  });

  it('throws an ApiError with the 403 status when the IdP user has no StarterKit account', async () => {
    server.use(
      http.get(ORGS_URL, () => HttpResponse.json({ message: 'No account' }, { status: 403 })),
    );

    await expect(organisationsDatasource.getLinkedOrganisations()).rejects.toBeInstanceOf(ApiError);
    await organisationsDatasource.getLinkedOrganisations().catch((err: ApiError) => {
      expect(err.status).toBe(403);
      expect(err.isForbidden).toBeTruthy();
    });
  });

  it('throws an ApiError with the 404 status when the org endpoint is missing', async () => {
    server.use(
      http.get(ORGS_URL, () => HttpResponse.json({ message: 'Not found' }, { status: 404 })),
    );

    await organisationsDatasource.getLinkedOrganisations().catch((err: ApiError) => {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(404);
      expect(err.isNotFound).toBeTruthy();
    });
  });

  it('throws an ApiError surfacing the server message on a 500 response', async () => {
    server.use(http.get(ORGS_URL, () => HttpResponse.json({ message: 'Boom' }, { status: 500 })));

    await organisationsDatasource.getLinkedOrganisations().catch((err: ApiError) => {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(500);
      expect(err.isServerError).toBeTruthy();
      expect(err.message).toBe('Boom');
    });
  });
});
