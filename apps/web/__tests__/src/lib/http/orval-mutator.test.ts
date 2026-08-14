import { customInstance } from '@lib/http/orval-mutator';
import { HttpResponse, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/test/mocks/server';

const mockGetIdToken = vi.hoisted(() => vi.fn<() => Promise<string>>());

vi.mock('@lib/firebase/config', () => ({
  firebaseAuth: {
    currentUser: { getIdToken: mockGetIdToken },
  },
}));

describe('customInstance (orval mutator)', () => {
  afterEach(() => {
    server.resetHandlers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetIdToken.mockResolvedValue('test-firebase-token');
  });

  it('makes a GET request and returns the response data', async () => {
    const payload = { id: '1', name: 'Test' };
    server.use(http.get('*/api/resource', () => HttpResponse.json(payload)));

    const result = await customInstance<typeof payload>({ url: '/api/resource', method: 'GET' });

    expect(result).toEqual(payload);
  });

  it('makes a POST request with the provided data', async () => {
    const responsePayload = { id: '2', name: 'Created' };
    let capturedBody: unknown;

    server.use(
      http.post('*/api/resource', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(responsePayload, { status: 201 });
      }),
    );

    const result = await customInstance<typeof responsePayload>({
      url: '/api/resource',
      method: 'POST',
      data: { name: 'Created' },
    });

    expect(result).toEqual(responsePayload);
    expect(capturedBody).toEqual({ name: 'Created' });
  });

  it('propagates errors thrown by the underlying apiClient', async () => {
    server.use(
      http.get('*/api/fail', () => HttpResponse.json({ message: 'Not Found' }, { status: 404 })),
    );

    await expect(customInstance({ url: '/api/fail', method: 'GET' })).rejects.toMatchObject({
      status: 404,
    });
  });
});
