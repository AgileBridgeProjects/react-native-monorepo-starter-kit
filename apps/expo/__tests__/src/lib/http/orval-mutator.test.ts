import { ApiError } from '@lib/http/api-error';
import { customInstance } from '@lib/http/orval-mutator';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '@/test/mocks/server';

// orval-mutator delegates to the singleton apiClient, whose baseURL defaults to
// http://localhost:5001 in tests (see api-client.ts).
const BASE_URL = 'http://localhost:5001';

describe('customInstance', () => {
  it('unwraps the axios response and resolves with response.data only', async () => {
    server.use(
      http.get(`${BASE_URL}/widgets/1`, () => HttpResponse.json({ id: '1', name: 'gear' })),
    );

    const result = await customInstance<{ id: string; name: string }>({
      url: '/widgets/1',
      method: 'GET',
    });

    expect(result).toEqual({ id: '1', name: 'gear' });
  });

  it('forwards the HTTP method and request body to the server', async () => {
    let method: string | undefined;
    let body: unknown;
    server.use(
      http.post(`${BASE_URL}/widgets`, async ({ request }) => {
        method = request.method;
        body = await request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    await customInstance({ url: '/widgets', method: 'POST', data: { name: 'cog' } });

    expect(method).toBe('POST');
    expect(body).toEqual({ name: 'cog' });
  });

  it('serialises query params into the request URL', async () => {
    let search = '';
    server.use(
      http.get(`${BASE_URL}/widgets`, ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json([]);
      }),
    );

    await customInstance({ url: '/widgets', method: 'GET', params: { page: 2, q: 'gear' } });

    expect(search).toContain('page=2');
    expect(search).toContain('q=gear');
  });

  it('rejects with a normalised ApiError on a 4xx response', async () => {
    server.use(
      http.get(`${BASE_URL}/widgets/missing`, () =>
        HttpResponse.json({ message: 'Gone', code: 'NF' }, { status: 404 }),
      ),
    );

    await expect(customInstance({ url: '/widgets/missing', method: 'GET' })).rejects.toBeInstanceOf(
      ApiError,
    );

    await customInstance({ url: '/widgets/missing', method: 'GET' }).catch((err: ApiError) => {
      expect(err.status).toBe(404);
      expect(err.isNotFound).toBeTruthy();
      expect(err.message).toBe('Gone');
    });
  });

  it('propagates a server 500 as an ApiError', async () => {
    server.use(http.get(`${BASE_URL}/widgets/boom`, () => new HttpResponse(null, { status: 500 })));

    await expect(customInstance({ url: '/widgets/boom', method: 'GET' })).rejects.toMatchObject({
      status: 500,
      isServerError: true,
    });
  });

  it('supports request cancellation via an AbortSignal', async () => {
    server.use(
      http.get(`${BASE_URL}/widgets/slow`, async () => {
        await new Promise((r) => setTimeout(r, 200));
        return HttpResponse.json({ id: 'slow' });
      }),
    );

    const controller = new AbortController();
    const promise = customInstance({
      url: '/widgets/slow',
      method: 'GET',
      signal: controller.signal,
    });
    controller.abort();

    await expect(promise).rejects.toBeDefined();
  });
});
