import type { RoleResponse } from '@/proxy/models';

export type Role = Required<
  Pick<RoleResponse, 'id' | 'name' | 'isActive' | 'isSystem' | 'isElevated' | 'isPortalRole'>
> & {
  description: string | null;
  isDefault: boolean;
  clubId: string | null;
  permissions: string[];
};
