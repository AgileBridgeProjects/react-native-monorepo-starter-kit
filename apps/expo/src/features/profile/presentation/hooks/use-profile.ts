import { mmkvStorage } from '@lib/storage/mmkv-storage';
import type { QueryClient } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { UpdateProfileRequest } from '@/src/proxy/models';
import { ProfileDataSource, type ReactNativeFile } from '../../infrastructure/profile.datasource';

const profileDataSource = new ProfileDataSource();

export const PROFILE_QUERY_KEY = ['profile'] as const;

/**
 * Imperative profile fetch for call sites that aren't React components (e.g. a
 * mutation's `onSuccess` callback) and so can't call `useProfile()` directly. Goes
 * through the query cache like the hook does, so the result is available to the
 * next screen without a redundant refetch.
 */
export function fetchProfile(queryClient: QueryClient) {
  return queryClient.fetchQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => profileDataSource.getProfile(),
  });
}

const AVATAR_URL_KEY = 'profile:avatarUrl';

export function getCachedAvatarUrl(): string | null {
  return mmkvStorage.getItem(AVATAR_URL_KEY);
}

export function setCachedAvatarUrl(url: string): void {
  mmkvStorage.setItem(AVATAR_URL_KEY, url);
}

export function clearCachedAvatarUrl(): void {
  mmkvStorage.removeItem(AVATAR_URL_KEY);
}

export function useProfile(enabled = true) {
  const query = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => profileDataSource.getProfile(),
    enabled,
  });

  // Cache the avatar URL so it survives cold starts (React Query cache is in-memory only).
  // Only write when we have a real displayable URL — don't clear on null, because in dev
  // resolveBlobUrl returns null for Azurite URLs and we don't want to wipe a valid cache.
  // Explicit clears happen via clearCachedAvatarUrl() on logout and removeAvatar.
  useEffect(() => {
    if (query.data?.avatarUrl != null) {
      mmkvStorage.setItem(AVATAR_URL_KEY, query.data.avatarUrl);
    }
  }, [query.data?.avatarUrl]);

  return query;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateProfileRequest) => profileDataSource.updateProfile(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}

export function useUploadAvatar() {
  return useMutation({
    mutationFn: (file: ReactNativeFile) => profileDataSource.uploadAvatar(file),
    // No invalidation here — the blob path isn't persisted until updateProfile runs.
    // Invalidating now would refetch profile before the avatar is saved, caching
    // avatarUrl=null and causing a grey flash on the next mount.
  });
}
