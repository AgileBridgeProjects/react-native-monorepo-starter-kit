import type { PermissionGroup } from '@features/roles/domain/entities/permission-group';
import type { PermissionGroupResponse, PermissionItemResponse } from '@/proxy/models';
import { getApiRolesPermissions } from '@/proxy/services/roles/roles';

export const permissionGroupDatasource = {
  async list(): Promise<PermissionGroup[]> {
    const data = await getApiRolesPermissions();
    return (data ?? []).map((g: PermissionGroupResponse) => ({
      group: g.group ?? '',
      permissions: (g.permissions ?? []).map((p: PermissionItemResponse) => ({
        key: p.key ?? '',
        description: p.description ?? '',
      })),
    }));
  },
};
