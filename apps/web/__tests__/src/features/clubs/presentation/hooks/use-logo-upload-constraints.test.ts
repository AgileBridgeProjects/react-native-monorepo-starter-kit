import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithProviders } from '@/test/utils/render-with-providers';

// ─── Mock proxy ───────────────────────────────────────────────────────────────
vi.mock('@/proxy/services/clubs/clubs', () => ({
  getApiClubsUploadConstraints: vi.fn(),
}));

// ─── Mock query config (stable timing in tests) ───────────────────────────────
vi.mock('@lib/http/query-config', () => ({
  queryCacheConfig: {
    static: { staleTime: 0, gcTime: 0 },
  },
}));

import { useLogoUploadConstraints } from '@features/clubs/presentation/hooks/use-logo-upload-constraints';
import { getApiClubsUploadConstraints } from '@/proxy/services/clubs/clubs';

const mockGet = vi.mocked(getApiClubsUploadConstraints);

describe('useLogoUploadConstraints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes MIME types, accept attribute, and derived MB size when the proxy resolves', async () => {
    mockGet.mockResolvedValue({
      allowedContentTypes: ['image/svg+xml', 'image/png'],
      maxFileSizeBytes: 2 * 1024 * 1024,
    });

    const { result } = renderHookWithProviders(() => useLogoUploadConstraints());

    await waitFor(() => expect(result.current.isSuccess).toBeTruthy());

    expect(result.current.data).toEqual({
      acceptedMimeTypes: ['image/svg+xml', 'image/png'],
      acceptedAttribute: 'image/svg+xml,image/png',
      maxFileSizeBytes: 2 * 1024 * 1024,
      maxFileSizeMb: 2,
    });
  });

  it('coerces the proxy string-form of int64 to a number', async () => {
    // Orval emits `number | string` for int64 fields. The hook must coerce.
    mockGet.mockResolvedValue({
      allowedContentTypes: ['image/png'],
      maxFileSizeBytes: '5242880' as unknown as number,
    });

    const { result } = renderHookWithProviders(() => useLogoUploadConstraints());

    await waitFor(() => expect(result.current.isSuccess).toBeTruthy());

    expect(result.current.data?.maxFileSizeBytes).toBe(5_242_880);
    expect(result.current.data?.maxFileSizeMb).toBe(5);
  });

  it('surfaces proxy errors', async () => {
    const error = new Error('Network down');
    mockGet.mockRejectedValue(error);

    const { result } = renderHookWithProviders(() => useLogoUploadConstraints());

    await waitFor(() => expect(result.current.isError).toBeTruthy());
    expect(result.current.error).toBe(error);
  });
});
