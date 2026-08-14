import { HelpDataSource } from '@features/profile/infrastructure/help.datasource';
import { ApiError } from '@lib/http/api-error';
import { HttpResponse, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { makeHelpRequest } from '@/test/factories/profile.factory';
import { server } from '@/test/mocks/server';

// apiClient (orval-mutator) defaults its baseURL to http://localhost:5001 in tests.
const BASE_URL = 'http://localhost:5001';

const datasource = new HelpDataSource();

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
});

describe('HelpDataSource.sendHelpEmail', () => {
  it('POSTs the subject and body to /api/support/help and resolves on 204', async () => {
    let capturedBody: unknown;
    server.use(
      http.post(`${BASE_URL}/api/support/help`, async ({ request }) => {
        capturedBody = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const payload = makeHelpRequest({ subject: 'Hello', body: 'I need help with my games.' });
    await datasource.sendHelpEmail(payload);

    expect(requestedUrls).toContain('/api/support/help');
    expect(requestedMethods).toContain('POST');
    expect(capturedBody).toEqual({ subject: 'Hello', body: 'I need help with my games.' });
  });

  it('resolves successfully on a 2xx response', async () => {
    server.use(http.post(`${BASE_URL}/api/support/help`, () => HttpResponse.json({ ok: true })));
    await expect(datasource.sendHelpEmail(makeHelpRequest())).resolves.toBeDefined();
  });

  it('rejects with an ApiError carrying status 400 on validation failure', async () => {
    server.use(
      http.post(`${BASE_URL}/api/support/help`, () =>
        HttpResponse.json({ message: 'Subject is required' }, { status: 400 }),
      ),
    );

    await expect(datasource.sendHelpEmail(makeHelpRequest())).rejects.toBeInstanceOf(ApiError);
    await expect(datasource.sendHelpEmail(makeHelpRequest())).rejects.toMatchObject({
      status: 400,
    });
  });

  it('rejects with an ApiError carrying status 401 when unauthenticated', async () => {
    server.use(
      http.post(`${BASE_URL}/api/support/help`, () =>
        HttpResponse.json({ message: 'Unauthorized' }, { status: 401 }),
      ),
    );

    await expect(datasource.sendHelpEmail(makeHelpRequest())).rejects.toMatchObject({
      status: 401,
    });
  });

  it('rejects with an ApiError carrying status 500 on a server error', async () => {
    server.use(
      http.post(`${BASE_URL}/api/support/help`, () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    );

    await expect(datasource.sendHelpEmail(makeHelpRequest())).rejects.toMatchObject({
      status: 500,
    });
  });
});
