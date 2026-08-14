import { apiClient } from '@/src/lib/http/api-client';
import { ApiError } from '@/src/lib/http/api-error';
import { resolveBlobUrl } from '@/src/lib/http/resolve-blob-url';
import type {
  UpdateProfileRequest,
  UploadAvatarResponse,
  UserProfileResponse,
} from '@/src/proxy/models';
import { getApiUsersMeProfile, patchApiUsersMeProfile } from '@/src/proxy/services/users/users';

/** React Native file object passed from ImagePicker */
export type ReactNativeFile = { uri: string; name: string; type: string };

export class ProfileDataSource {
  async getProfile(): Promise<UserProfileResponse> {
    const result = await getApiUsersMeProfile();
    return { ...result, avatarUrl: resolveBlobUrl(result.avatarUrl) ?? null };
  }

  async updateProfile(request: UpdateProfileRequest): Promise<void> {
    return patchApiUsersMeProfile(request);
  }

  async uploadAvatar(file: ReactNativeFile): Promise<UploadAvatarResponse> {
    // Must use raw XHR — not fetch, not axios. On RN new architecture, fetch()
    // rejects { uri, name, type } FormData parts with "Unsupported FormDataPart
    // implementation". Axios also routes through fetch on new arch. Only XHR's
    // native send() correctly serialises the RN file object from ImagePicker.
    const doRequest = (token: string | null): Promise<{ status: number; body: string }> =>
      new Promise((resolve, reject) => {
        const baseURL = apiClient.defaults.baseURL ?? '';
        const url = `${baseURL}/api/users/me/avatar`;

        const formData = new FormData();
        if (file.uri.startsWith('blob:') || file.uri.startsWith('data:')) {
          // Web: fetch the blob first, then attach as a proper File.
          fetch(file.uri)
            .then((r) => r.blob())
            .then((blob) => {
              formData.append('file', new File([blob], file.name, { type: file.type }));
              send();
            })
            .catch(reject);
        } else {
          // Native: { uri, name, type } is the RN FormData file format.
          formData.append('file', file as unknown as Blob);
          send();
        }

        function send() {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', url);
          if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.timeout = 30_000;
          xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText });
          xhr.onerror = () => reject(new Error('Network request failed'));
          xhr.ontimeout = () => reject(new Error('Request timed out'));
          xhr.send(formData);
        }
      });

    const { authStoreUtils } = await import('@store/auth-store');
    let token = authStoreUtils.getIdToken();

    let result: { status: number; body: string };
    try {
      result = await doRequest(token);
    } catch (err) {
      throw new ApiError(0, err instanceof Error ? err.message : 'Network error');
    }

    // Retry once with a fresh Supabase token on 401 (mirrors the apiClient interceptor).
    if (result.status === 401) {
      const { supabase } = await import('@lib/supabase/config');
      const { data } = await supabase.auth.refreshSession();
      const newToken = data.session?.access_token;
      if (newToken) {
        const { useAuthStore } = await import('@store/auth-store');
        const state = useAuthStore.getState();
        if (state.user) state.setAuth(state.user, newToken);
        token = newToken;
        try {
          result = await doRequest(newToken);
        } catch (err) {
          throw new ApiError(0, err instanceof Error ? err.message : 'Network error');
        }
      }
    }

    if (result.status < 200 || result.status >= 300) {
      let message = `Upload failed (${result.status})`;
      try {
        const data = JSON.parse(result.body) as {
          message?: string;
          title?: string;
          errors?: Record<string, string[]>;
        };
        const firstFieldError = data.errors ? Object.values(data.errors).flat()[0] : undefined;
        message = data.message ?? firstFieldError ?? data.title ?? message;
      } catch {
        // Non-JSON body — keep default message
      }
      throw new ApiError(result.status, message);
    }

    const response = JSON.parse(result.body) as UploadAvatarResponse;
    return { ...response, avatarUrl: resolveBlobUrl(response.avatarUrl) ?? response.avatarUrl };
  }
}
