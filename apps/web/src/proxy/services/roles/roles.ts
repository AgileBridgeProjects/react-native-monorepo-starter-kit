// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0

import { customInstance } from '../../../lib/http/orval-mutator';
import type {
  CreateRoleRequest,
  GetApiRolesIdAssignmentsParams,
  GetApiRolesParams,
  PagedResponseOfRoleUserAssignmentResponse,
  PermissionGroupResponse,
  RoleListResponse,
  RoleResponse,
  UpdateRolePermissionsRequest,
  UpdateRoleRequest,
} from '../../models';

export const getApiRoles = (params?: GetApiRolesParams) => {
  return customInstance<RoleListResponse>({ url: `/api/roles`, method: 'GET', params });
};
export const postApiRoles = (createRoleRequest: CreateRoleRequest) => {
  return customInstance<RoleResponse>({
    url: `/api/roles`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: createRoleRequest,
  });
};
export const getApiRolesPermissions = () => {
  return customInstance<PermissionGroupResponse[]>({
    url: `/api/roles/permissions`,
    method: 'GET',
  });
};
export const getApiRolesId = (id: string) => {
  return customInstance<RoleResponse>({ url: `/api/roles/${id}`, method: 'GET' });
};
export const putApiRolesId = (id: string, updateRoleRequest: UpdateRoleRequest) => {
  return customInstance<RoleResponse>({
    url: `/api/roles/${id}`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    data: updateRoleRequest,
  });
};
export const deleteApiRolesId = (id: string) => {
  return customInstance<void>({ url: `/api/roles/${id}`, method: 'DELETE' });
};
export const postApiRolesIdActivate = (id: string) => {
  return customInstance<void>({ url: `/api/roles/${id}/activate`, method: 'POST' });
};
export const putApiRolesIdPermissions = (
  id: string,
  updateRolePermissionsRequest: UpdateRolePermissionsRequest,
) => {
  return customInstance<RoleResponse>({
    url: `/api/roles/${id}/permissions`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    data: updateRolePermissionsRequest,
  });
};
export const getApiRolesIdAssignments = (id: string, params?: GetApiRolesIdAssignmentsParams) => {
  return customInstance<PagedResponseOfRoleUserAssignmentResponse>({
    url: `/api/roles/${id}/assignments`,
    method: 'GET',
    params,
  });
};
export type GetApiRolesResult = NonNullable<Awaited<ReturnType<typeof getApiRoles>>>;
export type PostApiRolesResult = NonNullable<Awaited<ReturnType<typeof postApiRoles>>>;
export type GetApiRolesPermissionsResult = NonNullable<
  Awaited<ReturnType<typeof getApiRolesPermissions>>
>;
export type GetApiRolesIdResult = NonNullable<Awaited<ReturnType<typeof getApiRolesId>>>;
export type PutApiRolesIdResult = NonNullable<Awaited<ReturnType<typeof putApiRolesId>>>;
export type DeleteApiRolesIdResult = NonNullable<Awaited<ReturnType<typeof deleteApiRolesId>>>;
export type PostApiRolesIdActivateResult = NonNullable<
  Awaited<ReturnType<typeof postApiRolesIdActivate>>
>;
export type PutApiRolesIdPermissionsResult = NonNullable<
  Awaited<ReturnType<typeof putApiRolesIdPermissions>>
>;
export type GetApiRolesIdAssignmentsResult = NonNullable<
  Awaited<ReturnType<typeof getApiRolesIdAssignments>>
>;
