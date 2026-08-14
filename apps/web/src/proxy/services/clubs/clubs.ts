// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0

import { customInstance } from '../../../lib/http/orval-mutator';
import type {
  ClubListResponse,
  ClubResponse,
  CreateClubRequest,
  GetApiClubsParams,
  PostApiClubsImagesBody,
  UpdateClubRequest,
  UploadClubLogoResponse,
  UploadConstraintsResponse,
} from '../../models';

export const getApiClubs = (params?: GetApiClubsParams) => {
  return customInstance<ClubListResponse>({ url: `/api/clubs`, method: 'GET', params });
};
export const postApiClubs = (createClubRequest: CreateClubRequest) => {
  return customInstance<ClubResponse>({
    url: `/api/clubs`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: createClubRequest,
  });
};
export const getApiClubsId = (id: string) => {
  return customInstance<ClubResponse>({ url: `/api/clubs/${id}`, method: 'GET' });
};
export const putApiClubsId = (id: string, updateClubRequest: UpdateClubRequest) => {
  return customInstance<ClubResponse>({
    url: `/api/clubs/${id}`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    data: updateClubRequest,
  });
};
export const deleteApiClubsId = (id: string) => {
  return customInstance<void>({ url: `/api/clubs/${id}`, method: 'DELETE' });
};
export const postApiClubsImages = (postApiClubsImagesBody: PostApiClubsImagesBody) => {
  const formData = new FormData();
  if (postApiClubsImagesBody.file !== undefined) {
    formData.append(`file`, postApiClubsImagesBody.file);
  }

  return customInstance<UploadClubLogoResponse>({
    url: `/api/clubs/images`,
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data' },
    data: formData,
  });
};
export const getApiClubsUploadConstraints = () => {
  return customInstance<UploadConstraintsResponse>({
    url: `/api/clubs/upload-constraints`,
    method: 'GET',
  });
};
export type GetApiClubsResult = NonNullable<Awaited<ReturnType<typeof getApiClubs>>>;
export type PostApiClubsResult = NonNullable<Awaited<ReturnType<typeof postApiClubs>>>;
export type GetApiClubsIdResult = NonNullable<Awaited<ReturnType<typeof getApiClubsId>>>;
export type PutApiClubsIdResult = NonNullable<Awaited<ReturnType<typeof putApiClubsId>>>;
export type DeleteApiClubsIdResult = NonNullable<Awaited<ReturnType<typeof deleteApiClubsId>>>;
export type PostApiClubsImagesResult = NonNullable<Awaited<ReturnType<typeof postApiClubsImages>>>;
export type GetApiClubsUploadConstraintsResult = NonNullable<
  Awaited<ReturnType<typeof getApiClubsUploadConstraints>>
>;
