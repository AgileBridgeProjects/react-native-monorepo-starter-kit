import {
  clearCachedAvatarUrl,
  getCachedAvatarUrl,
  PROFILE_QUERY_KEY,
  setCachedAvatarUrl,
  useProfile,
  useUpdateProfile,
  useUploadAvatar,
} from '@features/profile/presentation/hooks/use-profile';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import { act, create } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeUserProfile } from '@/test/factories/profile.factory';
import { renderHook } from '@/test/utils/render-hook';

const getProfile = vi.fn();
const updateProfile = vi.fn();
const uploadAvatar = vi.fn();
vi.mock('@features/profile/infrastructure/profile.datasource', () => ({
  ProfileDataSource: vi.fn(() => ({
    getProfile: () => getProfile(),
    updateProfile: (...args: unknown[]) => updateProfile(...args),
    uploadAvatar: (...args: unknown[]) => uploadAvatar(...args),
  })),
}));

const mmkvSet = vi.fn();
const mmkvGet = vi.fn();
const mmkvRemove = vi.fn();
vi.mock('@lib/storage/mmkv-storage', () => ({
  mmkvStorage: {
    getItem: (...args: unknown[]) => mmkvGet(...args),
    setItem: (...args: unknown[]) => mmkvSet(...args),
    removeItem: (...args: unknown[]) => mmkvRemove(...args),
  },
}));

const AVATAR_URL_KEY = 'profile:avatarUrl';

function renderWithClient<T>(useHook: () => T, queryClient: QueryClient) {
  let current: T | undefined;
  function Harness(): ReactNode {
    current = useHook();
    return null;
  }
  let renderer: ReturnType<typeof create> | undefined;
  act(() => {
    renderer = create(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(Harness),
      ),
    );
  });
  return {
    get current() {
      if (current === undefined) throw new Error('hook value not ready');
      return current;
    },
    update: () =>
      act(() => {
        renderer?.update(
          React.createElement(
            QueryClientProvider,
            { client: queryClient },
            React.createElement(Harness),
          ),
        );
      }),
  };
}

const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

async function fetchQuery(client: QueryClient) {
  await act(async () => {
    await client
      .getQueryCache()
      .find({ queryKey: PROFILE_QUERY_KEY })
      ?.fetch()
      .catch(() => {});
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Cached-avatar MMKV helpers ────────────────────────────────────────────────

describe('avatar URL cache helpers', () => {
  it('reads the cached avatar URL from MMKV under the profile:avatarUrl key', () => {
    mmkvGet.mockReturnValue('https://cdn/me.jpg');
    expect(getCachedAvatarUrl()).toBe('https://cdn/me.jpg');
    expect(mmkvGet).toHaveBeenCalledWith(AVATAR_URL_KEY);
  });

  it('writes the cached avatar URL to MMKV', () => {
    setCachedAvatarUrl('https://cdn/new.jpg');
    expect(mmkvSet).toHaveBeenCalledWith(AVATAR_URL_KEY, 'https://cdn/new.jpg');
  });

  it('clears the cached avatar URL from MMKV', () => {
    clearCachedAvatarUrl();
    expect(mmkvRemove).toHaveBeenCalledWith(AVATAR_URL_KEY);
  });
});

// ─── PROFILE_QUERY_KEY ───────────────────────────────────────────────────────--

describe('PROFILE_QUERY_KEY', () => {
  it('is the stable ["profile"] tuple', () => {
    expect(PROFILE_QUERY_KEY).toEqual(['profile']);
  });
});

// ─── useProfile ────────────────────────────────────────────────────────────────

describe('useProfile', () => {
  it('fetches the profile from the datasource on success', async () => {
    getProfile.mockResolvedValue(makeUserProfile({ displayName: 'Jamie' }));
    const client = newClient();
    const hook = renderWithClient(() => useProfile(), client);

    await fetchQuery(client);
    hook.update();

    expect(getProfile).toHaveBeenCalledTimes(1);
    expect(hook.current.data?.displayName).toBe('Jamie');
  });

  it('caches a real avatar URL into MMKV after fetch', async () => {
    getProfile.mockResolvedValue(makeUserProfile({ avatarUrl: 'https://cdn/me.jpg' }));
    const client = newClient();
    const hook = renderWithClient(() => useProfile(), client);

    await fetchQuery(client);
    hook.update();

    expect(mmkvSet).toHaveBeenCalledWith(AVATAR_URL_KEY, 'https://cdn/me.jpg');
  });

  it('does NOT wipe the cache when the resolved avatar URL is null', async () => {
    getProfile.mockResolvedValue(makeUserProfile({ avatarUrl: null }));
    const client = newClient();
    const hook = renderWithClient(() => useProfile(), client);

    await fetchQuery(client);
    hook.update();

    expect(mmkvSet).not.toHaveBeenCalled();
    expect(mmkvRemove).not.toHaveBeenCalled();
  });

  it('exposes the error state when the fetch fails', async () => {
    getProfile.mockRejectedValue(new Error('boom'));
    const client = newClient();
    const hook = renderWithClient(() => useProfile(), client);

    await fetchQuery(client);
    hook.update();

    expect(hook.current.isError).toBeTruthy();
  });
});

// ─── useUpdateProfile ────────────────────────────────────────────────────────--

describe('useUpdateProfile', () => {
  it('is idle before mutating', () => {
    const { result } = renderHook(() => useUpdateProfile());
    expect(result.current.isPending).toBeFalsy();
  });

  it('forwards the request and invalidates the profile query on success', async () => {
    updateProfile.mockResolvedValue(undefined);
    const client = newClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const hook = renderWithClient(() => useUpdateProfile(), client);

    await act(async () => {
      await hook.current.mutateAsync({ displayName: 'Updated' });
    });

    expect(updateProfile).toHaveBeenCalledWith({ displayName: 'Updated' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: PROFILE_QUERY_KEY });
  });

  it('enters the error state and does not invalidate when the update fails', async () => {
    updateProfile.mockRejectedValue(new Error('update failed'));
    const client = newClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const hook = renderWithClient(() => useUpdateProfile(), client);

    await act(async () => {
      await hook.current.mutateAsync({ displayName: 'x' }).catch(() => {});
    });
    hook.update();

    expect(hook.current.isError).toBeTruthy();
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

// ─── useUploadAvatar ─────────────────────────────────────────────────────────--

describe('useUploadAvatar', () => {
  it('forwards the file to the datasource and resolves the upload response', async () => {
    uploadAvatar.mockResolvedValue({ avatarBlobPath: 'p', avatarUrl: 'https://cdn/x.jpg' });
    const file = { uri: 'file:///a.jpg', name: 'avatar.jpg', type: 'image/jpeg' };
    const { result, rerender } = renderHook(() => useUploadAvatar());

    let resolved: { avatarBlobPath: string } | undefined;
    await act(async () => {
      resolved = await result.current.mutateAsync(file);
    });
    rerender();

    expect(uploadAvatar).toHaveBeenCalledWith(file);
    expect(resolved?.avatarBlobPath).toBe('p');
    expect(result.current.data?.avatarBlobPath).toBe('p');
  });

  it('does NOT invalidate the profile query (avoids a grey flash before save)', async () => {
    uploadAvatar.mockResolvedValue({ avatarBlobPath: 'p', avatarUrl: 'https://cdn/x.jpg' });
    const client = newClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const hook = renderWithClient(() => useUploadAvatar(), client);

    await act(async () => {
      await hook.current.mutateAsync({ uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' });
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('surfaces an upload error', async () => {
    uploadAvatar.mockRejectedValue(new Error('upload failed'));
    const { result, rerender } = renderHook(() => useUploadAvatar());

    await act(async () => {
      await result.current
        .mutateAsync({ uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' })
        .catch(() => {});
    });
    rerender();

    expect(result.current.isError).toBeTruthy();
  });
});
