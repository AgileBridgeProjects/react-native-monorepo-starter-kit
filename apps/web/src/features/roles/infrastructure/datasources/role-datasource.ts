import type { RoleResponse, RoleUserAssignmentResponse } from '@/proxy/models';
import {
  deleteApiRolesId,
  getApiRoles,
  getApiRolesIdAssignments,
  postApiRoles,
  postApiRolesIdActivate,
  putApiRolesId,
  putApiRolesIdPermissions,
} from '@/proxy/services/roles/roles';
import type { Role } from '../../domain/entities/role';

// ─── Mapping ─────────────────────────────────────────────────────────────────

function toRole(dto: RoleResponse): Role {
  const missingFields: string[] = [];
  if (!dto.id) missingFields.push('id');
  if (!dto.name) missingFields.push('name');
  if (dto.isActive == null) missingFields.push('isActive');
  if (dto.isSystem == null) missingFields.push('isSystem');
  if (missingFields.length > 0) {
    throw new Error(`RoleResponse missing required fields: ${missingFields.join(', ')}`);
  }
  return {
    id: dto.id as string,
    name: dto.name as string,
    description: dto.description ?? null,
    isActive: dto.isActive as boolean,
    isDefault: dto.isDefault ?? false,
    isSystem: dto.isSystem as boolean,
    isElevated: dto.isElevated ?? false,
    isPortalRole: dto.isPortalRole ?? false,
    clubId: dto.clubId ?? null,
    permissions: dto.permissions ?? [],
  };
}

// ─── Datasource ───────────────────────────────────────────────────────────────

export const roleDatasource = {
  async list(includeInactive = false): Promise<Role[]> {
    const response = await getApiRoles(includeInactive ? { includeInactive: true } : undefined);
    return (response.items ?? []).map(toRole);
  },

  async create(
    name: string,
    description: string | null,
    isElevated: boolean,
    isPortalRole: boolean,
    clubId: string | null,
  ): Promise<Role> {
    const dto = await postApiRoles({
      name,
      description: description ?? undefined,
      isElevated,
      isPortalRole,
      clubId: clubId ?? undefined,
    });
    return toRole(dto);
  },

  async update(
    id: string,
    name: string,
    description: string | null,
    isElevated: boolean,
    isPortalRole: boolean,
    clubId: string | null,
  ): Promise<Role> {
    const dto = await putApiRolesId(id, {
      name,
      description: description ?? undefined,
      isElevated,
      isPortalRole,
      clubId: clubId ?? undefined,
    });
    return toRole(dto);
  },

  async deactivate(id: string): Promise<void> {
    await deleteApiRolesId(id);
  },

  async activate(id: string): Promise<void> {
    await postApiRolesIdActivate(id);
  },

  async updatePermissions(id: string, permissions: string[]): Promise<Role> {
    const dto = await putApiRolesIdPermissions(id, { permissions });
    return toRole(dto);
  },

  async getAssignments(id: string): Promise<RoleUserAssignmentResponse[]> {
    const response = await getApiRolesIdAssignments(id);
    return response.items ?? [];
  },
};
