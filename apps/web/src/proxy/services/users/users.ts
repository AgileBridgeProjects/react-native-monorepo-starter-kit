// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0

import { blobInstance, customInstance } from '../../../lib/http/orval-mutator';
import type {
  AdminChangePasswordRequest,
  AdminCreateUserRequest,
  AssignRoleRequest,
  BulkUploadConfirmRequest,
  BulkUploadConfirmResponse,
  BulkUploadPreviewResponse,
  CompleteSetupRequest,
  FileContentResult,
  GetApiUsersBulkUploadTemplateParams,
  GetApiUsersExportParams,
  GetApiUsersParams,
  GetApiUsersSetupValidateParams,
  LinkUserToClubRequest,
  PostApiUsersBulkUploadPreviewBody,
  PostApiUsersBulkUploadPreviewParams,
  PostApiUsersIdResendSetupParams,
  RequestPasswordResetRequest,
  RequestPasswordResetResponse,
  ResendSetupResponse,
  UpdateUserRequest,
  UpdateUserStatusRequest,
  UserDefaultsResponse,
  UserListResponse,
  UserResponse,
  ValidateSetupTokenResponse,
} from '../../models';

export const postApiUsers = (adminCreateUserRequest: AdminCreateUserRequest) => {
  return customInstance<UserResponse>({
    url: `/api/users`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: adminCreateUserRequest,
  });
};
export const getApiUsers = (params?: GetApiUsersParams) => {
  return customInstance<UserListResponse>({ url: `/api/users`, method: 'GET', params });
};
export const getApiUsersId = (id: string) => {
  return customInstance<UserResponse>({ url: `/api/users/${id}`, method: 'GET' });
};
export const putApiUsersId = (id: string, updateUserRequest: UpdateUserRequest) => {
  return customInstance<UserResponse>({
    url: `/api/users/${id}`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    data: updateUserRequest,
  });
};
export const deleteApiUsersId = (id: string) => {
  return customInstance<void>({ url: `/api/users/${id}`, method: 'DELETE' });
};
export const postApiUsersIdLinkClub = (
  id: string,
  linkUserToClubRequest: LinkUserToClubRequest,
) => {
  return customInstance<UserResponse>({
    url: `/api/users/${id}/link-club`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: linkUserToClubRequest,
  });
};
export const postApiUsersIdRoles = (id: string, assignRoleRequest: AssignRoleRequest) => {
  return customInstance<UserResponse>({
    url: `/api/users/${id}/roles`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: assignRoleRequest,
  });
};
export const patchApiUsersIdStatus = (
  id: string,
  updateUserStatusRequest: UpdateUserStatusRequest,
) => {
  return customInstance<void>({
    url: `/api/users/${id}/status`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    data: updateUserStatusRequest,
  });
};
export const postApiUsersIdResendSetup = (id: string, params?: PostApiUsersIdResendSetupParams) => {
  return customInstance<ResendSetupResponse>({
    url: `/api/users/${id}/resend-setup`,
    method: 'POST',
    params,
  });
};
export const getApiUsersDefaults = () => {
  return customInstance<UserDefaultsResponse>({ url: `/api/users/defaults`, method: 'GET' });
};
export const postApiUsersIdChangePassword = (
  id: string,
  adminChangePasswordRequest: AdminChangePasswordRequest,
) => {
  return customInstance<void>({
    url: `/api/users/${id}/change-password`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: adminChangePasswordRequest,
  });
};
export const deleteApiUsersIdAvatar = (id: string) => {
  return customInstance<void>({ url: `/api/users/${id}/avatar`, method: 'DELETE' });
};
export const getApiUsersExport = (params?: GetApiUsersExportParams) => {
  return blobInstance<FileContentResult>({ url: `/api/users/export`, method: 'GET', params });
};
export const getApiUsersBulkUploadTemplate = (params?: GetApiUsersBulkUploadTemplateParams) => {
  return blobInstance<FileContentResult>({
    url: `/api/users/bulk-upload/template`,
    method: 'GET',
    params,
  });
};
export const postApiUsersBulkUploadPreview = (
  postApiUsersBulkUploadPreviewBody: PostApiUsersBulkUploadPreviewBody,
  params?: PostApiUsersBulkUploadPreviewParams,
) => {
  const formData = new FormData();
  if (postApiUsersBulkUploadPreviewBody.File !== undefined) {
    formData.append(`File`, postApiUsersBulkUploadPreviewBody.File);
  }

  return customInstance<BulkUploadPreviewResponse>({
    url: `/api/users/bulk-upload/preview`,
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data' },
    data: formData,
    params,
  });
};
export const postApiUsersBulkUploadConfirm = (
  bulkUploadConfirmRequest: BulkUploadConfirmRequest,
) => {
  return customInstance<BulkUploadConfirmResponse>({
    url: `/api/users/bulk-upload/confirm`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: bulkUploadConfirmRequest,
  });
};
export const getApiUsersSetupValidate = (params?: GetApiUsersSetupValidateParams) => {
  return customInstance<ValidateSetupTokenResponse>({
    url: `/api/users/setup/validate`,
    method: 'GET',
    params,
  });
};
export const postApiUsersSetupComplete = (completeSetupRequest: CompleteSetupRequest) => {
  return customInstance<void>({
    url: `/api/users/setup/complete`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: completeSetupRequest,
  });
};
export const postApiUsersSetupPasswordResetRequest = (
  requestPasswordResetRequest: RequestPasswordResetRequest,
) => {
  return customInstance<RequestPasswordResetResponse | void>({
    url: `/api/users/setup/password-reset/request`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: requestPasswordResetRequest,
  });
};
export type PostApiUsersResult = NonNullable<Awaited<ReturnType<typeof postApiUsers>>>;
export type GetApiUsersResult = NonNullable<Awaited<ReturnType<typeof getApiUsers>>>;
export type GetApiUsersIdResult = NonNullable<Awaited<ReturnType<typeof getApiUsersId>>>;
export type PutApiUsersIdResult = NonNullable<Awaited<ReturnType<typeof putApiUsersId>>>;
export type DeleteApiUsersIdResult = NonNullable<Awaited<ReturnType<typeof deleteApiUsersId>>>;
export type PostApiUsersIdLinkClubResult = NonNullable<
  Awaited<ReturnType<typeof postApiUsersIdLinkClub>>
>;
export type PostApiUsersIdRolesResult = NonNullable<
  Awaited<ReturnType<typeof postApiUsersIdRoles>>
>;
export type PatchApiUsersIdStatusResult = NonNullable<
  Awaited<ReturnType<typeof patchApiUsersIdStatus>>
>;
export type PostApiUsersIdResendSetupResult = NonNullable<
  Awaited<ReturnType<typeof postApiUsersIdResendSetup>>
>;
export type GetApiUsersDefaultsResult = NonNullable<
  Awaited<ReturnType<typeof getApiUsersDefaults>>
>;
export type PostApiUsersIdChangePasswordResult = NonNullable<
  Awaited<ReturnType<typeof postApiUsersIdChangePassword>>
>;
export type DeleteApiUsersIdAvatarResult = NonNullable<
  Awaited<ReturnType<typeof deleteApiUsersIdAvatar>>
>;
export type GetApiUsersExportResult = NonNullable<Awaited<ReturnType<typeof getApiUsersExport>>>;
export type GetApiUsersBulkUploadTemplateResult = NonNullable<
  Awaited<ReturnType<typeof getApiUsersBulkUploadTemplate>>
>;
export type PostApiUsersBulkUploadPreviewResult = NonNullable<
  Awaited<ReturnType<typeof postApiUsersBulkUploadPreview>>
>;
export type PostApiUsersBulkUploadConfirmResult = NonNullable<
  Awaited<ReturnType<typeof postApiUsersBulkUploadConfirm>>
>;
export type GetApiUsersSetupValidateResult = NonNullable<
  Awaited<ReturnType<typeof getApiUsersSetupValidate>>
>;
export type PostApiUsersSetupCompleteResult = NonNullable<
  Awaited<ReturnType<typeof postApiUsersSetupComplete>>
>;
export type PostApiUsersSetupPasswordResetRequestResult = NonNullable<
  Awaited<ReturnType<typeof postApiUsersSetupPasswordResetRequest>>
>;
