// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0

import { customInstance } from '../../../lib/http/orval-mutator';
import type {
  GetApiResourcesParams,
  PostApiResourcesBody,
  PutApiResourcesIdBody,
  ResourceListResponse,
  ResourceResponse,
} from '../../models';

export const getApiResources = (params?: GetApiResourcesParams) => {
  return customInstance<ResourceListResponse>({ url: `/api/resources`, method: 'GET', params });
};
export const postApiResources = (postApiResourcesBody: PostApiResourcesBody) => {
  const formData = new FormData();
  if (postApiResourcesBody.Title !== undefined) {
    formData.append(`Title`, postApiResourcesBody.Title);
  }
  if (postApiResourcesBody.SourceType !== undefined) {
    formData.append(`SourceType`, postApiResourcesBody.SourceType);
  }
  if (postApiResourcesBody.File !== undefined) {
    formData.append(`File`, postApiResourcesBody.File);
  }

  return customInstance<ResourceResponse>({
    url: `/api/resources`,
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data' },
    data: formData,
  });
};
export const getApiResourcesId = (id: string) => {
  return customInstance<ResourceResponse>({ url: `/api/resources/${id}`, method: 'GET' });
};
export const putApiResourcesId = (id: string, putApiResourcesIdBody: PutApiResourcesIdBody) => {
  const formData = new FormData();
  if (putApiResourcesIdBody.Title !== undefined) {
    formData.append(`Title`, putApiResourcesIdBody.Title);
  }
  if (putApiResourcesIdBody.SourceType !== undefined) {
    formData.append(`SourceType`, putApiResourcesIdBody.SourceType);
  }
  if (putApiResourcesIdBody.File !== undefined) {
    formData.append(`File`, putApiResourcesIdBody.File);
  }

  return customInstance<ResourceResponse>({
    url: `/api/resources/${id}`,
    method: 'PUT',
    headers: { 'Content-Type': 'multipart/form-data' },
    data: formData,
  });
};
export const deleteApiResourcesId = (id: string) => {
  return customInstance<void>({ url: `/api/resources/${id}`, method: 'DELETE' });
};
export type GetApiResourcesResult = NonNullable<Awaited<ReturnType<typeof getApiResources>>>;
export type PostApiResourcesResult = NonNullable<Awaited<ReturnType<typeof postApiResources>>>;
export type GetApiResourcesIdResult = NonNullable<Awaited<ReturnType<typeof getApiResourcesId>>>;
export type PutApiResourcesIdResult = NonNullable<Awaited<ReturnType<typeof putApiResourcesId>>>;
export type DeleteApiResourcesIdResult = NonNullable<
  Awaited<ReturnType<typeof deleteApiResourcesId>>
>;
