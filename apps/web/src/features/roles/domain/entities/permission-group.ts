import type { PermissionGroupResponse, PermissionItemResponse } from '@/proxy/models';

// Derived from the proxy DTOs so the two types cannot drift.
// Required<Pick<...>> enforces that the listed fields are always present
// after the mapping function has validated them.
export type PermissionItem = Required<Pick<PermissionItemResponse, 'key' | 'description'>>;

export type PermissionGroup = Required<Pick<PermissionGroupResponse, 'group'>> & {
  permissions: PermissionItem[];
};
