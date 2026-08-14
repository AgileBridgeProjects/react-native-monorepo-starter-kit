// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0

import { customInstance } from '../../../lib/http/orval-mutator';
import type {
  ChangePasswordRequest,
  CompleteSetupRequest,
  GetApiUsersSetupValidateParams,
  LinkedAthleteResponse,
  LinkedTeamResponse,
  PostApiUsersMeAvatarBody,
  PostApiUsersMeFacePhotoBody,
  PostApiUsersMeFullBodyPhotoBody,
  PostApiUsersMeLinkedTeamsTeamIdLogoBody,
  RequestPasswordResetRequest,
  RequestPasswordResetResponse,
  SetLinkedAthleteRelationshipsRequest,
  UpdateProfileRequest,
  UploadAvatarResponse,
  UploadPhotoResponse,
  UserProfileResponse,
  ValidateSetupTokenResponse,
} from '../../models';

export const getApiUsersMeProfile = () => {
  return customInstance<UserProfileResponse>({ url: `/api/users/me/profile`, method: 'GET' });
};
export const patchApiUsersMeProfile = (updateProfileRequest: UpdateProfileRequest) => {
  return customInstance<void>({
    url: `/api/users/me/profile`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    data: updateProfileRequest,
  });
};
export const getApiUsersMeLinkedAthletes = () => {
  return customInstance<LinkedAthleteResponse[]>({
    url: `/api/users/me/linked-athletes`,
    method: 'GET',
  });
};
export const putApiUsersMeLinkedAthletesRelationships = (
  setLinkedAthleteRelationshipsRequest: SetLinkedAthleteRelationshipsRequest,
) => {
  return customInstance<void>({
    url: `/api/users/me/linked-athletes/relationships`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    data: setLinkedAthleteRelationshipsRequest,
  });
};
export const getApiUsersMeLinkedTeams = () => {
  return customInstance<LinkedTeamResponse[]>({ url: `/api/users/me/linked-teams`, method: 'GET' });
};
export const postApiUsersMeLinkedTeamsTeamIdLogo = (
  teamId: string,
  postApiUsersMeLinkedTeamsTeamIdLogoBody: PostApiUsersMeLinkedTeamsTeamIdLogoBody,
) => {
  const formData = new FormData();
  if (postApiUsersMeLinkedTeamsTeamIdLogoBody.file !== undefined) {
    formData.append(`file`, postApiUsersMeLinkedTeamsTeamIdLogoBody.file);
  }

  return customInstance<UploadPhotoResponse>({
    url: `/api/users/me/linked-teams/${teamId}/logo`,
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data' },
    data: formData,
  });
};
export const postApiUsersMeAvatar = (postApiUsersMeAvatarBody: PostApiUsersMeAvatarBody) => {
  const formData = new FormData();
  if (postApiUsersMeAvatarBody.file !== undefined) {
    formData.append(`file`, postApiUsersMeAvatarBody.file);
  }

  return customInstance<UploadAvatarResponse>({
    url: `/api/users/me/avatar`,
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data' },
    data: formData,
  });
};
export const postApiUsersMeFullBodyPhoto = (
  postApiUsersMeFullBodyPhotoBody: PostApiUsersMeFullBodyPhotoBody,
) => {
  const formData = new FormData();
  if (postApiUsersMeFullBodyPhotoBody.file !== undefined) {
    formData.append(`file`, postApiUsersMeFullBodyPhotoBody.file);
  }

  return customInstance<UploadPhotoResponse>({
    url: `/api/users/me/full-body-photo`,
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data' },
    data: formData,
  });
};
export const postApiUsersMeFacePhoto = (
  postApiUsersMeFacePhotoBody: PostApiUsersMeFacePhotoBody,
) => {
  const formData = new FormData();
  if (postApiUsersMeFacePhotoBody.file !== undefined) {
    formData.append(`file`, postApiUsersMeFacePhotoBody.file);
  }

  return customInstance<UploadPhotoResponse>({
    url: `/api/users/me/face-photo`,
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data' },
    data: formData,
  });
};
export const postApiUsersMeChangePassword = (changePasswordRequest: ChangePasswordRequest) => {
  return customInstance<void>({
    url: `/api/users/me/change-password`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: changePasswordRequest,
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
export type GetApiUsersMeProfileResult = NonNullable<
  Awaited<ReturnType<typeof getApiUsersMeProfile>>
>;
export type PatchApiUsersMeProfileResult = NonNullable<
  Awaited<ReturnType<typeof patchApiUsersMeProfile>>
>;
export type GetApiUsersMeLinkedAthletesResult = NonNullable<
  Awaited<ReturnType<typeof getApiUsersMeLinkedAthletes>>
>;
export type PutApiUsersMeLinkedAthletesRelationshipsResult = NonNullable<
  Awaited<ReturnType<typeof putApiUsersMeLinkedAthletesRelationships>>
>;
export type GetApiUsersMeLinkedTeamsResult = NonNullable<
  Awaited<ReturnType<typeof getApiUsersMeLinkedTeams>>
>;
export type PostApiUsersMeLinkedTeamsTeamIdLogoResult = NonNullable<
  Awaited<ReturnType<typeof postApiUsersMeLinkedTeamsTeamIdLogo>>
>;
export type PostApiUsersMeAvatarResult = NonNullable<
  Awaited<ReturnType<typeof postApiUsersMeAvatar>>
>;
export type PostApiUsersMeFullBodyPhotoResult = NonNullable<
  Awaited<ReturnType<typeof postApiUsersMeFullBodyPhoto>>
>;
export type PostApiUsersMeFacePhotoResult = NonNullable<
  Awaited<ReturnType<typeof postApiUsersMeFacePhoto>>
>;
export type PostApiUsersMeChangePasswordResult = NonNullable<
  Awaited<ReturnType<typeof postApiUsersMeChangePassword>>
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
