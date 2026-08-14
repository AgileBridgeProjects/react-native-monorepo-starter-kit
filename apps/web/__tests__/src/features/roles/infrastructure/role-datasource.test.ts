import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('@/proxy/services/roles/roles', () => ({
  getApiRoles: vi.fn(),
  postApiRoles: vi.fn(),
  putApiRolesId: vi.fn(),
  deleteApiRolesId: vi.fn(),
  putApiRolesIdPermissions: vi.fn(),
  postApiRolesIdActivate: vi.fn(),
}));

import { roleDatasource } from '@features/roles/infrastructure/datasources/role-datasource';
import {
  deleteApiRolesId,
  getApiRoles,
  postApiRoles,
  postApiRolesIdActivate,
  putApiRolesId,
  putApiRolesIdPermissions,
} from '@/proxy/services/roles/roles';

const mockGetApiRoles = vi.mocked(getApiRoles);
const mockPostApiRoles = vi.mocked(postApiRoles);
const mockPutApiRolesId = vi.mocked(putApiRolesId);
const mockDeleteApiRolesId = vi.mocked(deleteApiRolesId);
const mockPutApiRolesIdPermissions = vi.mocked(putApiRolesIdPermissions);
const mockPostApiRolesIdActivate = vi.mocked(postApiRolesIdActivate);

const fullRoleResponse = {
  id: 'role-1',
  name: 'Manager',
  description: 'Manages things',
  isActive: true,
  isDefault: false,
  isSystem: false,
  isElevated: false,
  isPortalRole: true,
  permissions: ['Users.View', 'Users.Edit'],
};

describe('roleDatasource', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('maps RoleResponse to Role domain entity', async () => {
      mockGetApiRoles.mockResolvedValue({
        items: [fullRoleResponse],
        totalCount: 1,
      } as never);

      const roles = await roleDatasource.list();

      expect(roles).toHaveLength(1);
      expect(roles[0]).toEqual({
        id: 'role-1',
        name: 'Manager',
        description: 'Manages things',
        isActive: true,
        isDefault: false,
        isSystem: false,
        isElevated: false,
        isPortalRole: true,
        clubId: null,
        permissions: ['Users.View', 'Users.Edit'],
      });
    });

    it('returns empty array when items is null', async () => {
      mockGetApiRoles.mockResolvedValue({ items: null, totalCount: 0 } as never);

      const roles = await roleDatasource.list();
      expect(roles).toEqual([]);
    });

    it('defaults optional fields when missing from response', async () => {
      mockGetApiRoles.mockResolvedValue({
        items: [
          {
            id: 'role-2',
            name: 'Viewer',
            description: null,
            isActive: true,
            isSystem: false,
            isElevated: undefined,
            isPortalRole: undefined,
            permissions: undefined,
          },
        ],
        totalCount: 1,
      } as never);

      const roles = await roleDatasource.list();
      expect(roles[0]).toMatchObject({
        description: null,
        isElevated: false,
        isPortalRole: false,
        permissions: [],
      });
    });

    it('throws when required fields are missing', async () => {
      mockGetApiRoles.mockResolvedValue({
        items: [{ id: null, name: null, isActive: null, isSystem: null }],
        totalCount: 1,
      } as never);

      await expect(roleDatasource.list()).rejects.toThrow(
        'RoleResponse missing required fields: id, name, isActive, isSystem',
      );
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('sends create request and maps response', async () => {
      mockPostApiRoles.mockResolvedValue(fullRoleResponse as never);

      const role = await roleDatasource.create('Manager', 'Manages things', false, true, null);

      expect(mockPostApiRoles).toHaveBeenCalledWith({
        name: 'Manager',
        description: 'Manages things',
        isElevated: false,
        isPortalRole: true,
      });
      expect(role.id).toBe('role-1');
    });

    it('converts null description to undefined for proxy', async () => {
      mockPostApiRoles.mockResolvedValue(fullRoleResponse as never);

      await roleDatasource.create('Manager', null, false, false, null);

      expect(mockPostApiRoles).toHaveBeenCalledWith(
        expect.objectContaining({ description: undefined }),
      );
    });

    it('sends clubId when provided', async () => {
      mockPostApiRoles.mockResolvedValue(fullRoleResponse as never);

      await roleDatasource.create('ClubRole', null, false, false, 'club-123');

      expect(mockPostApiRoles).toHaveBeenCalledWith(
        expect.objectContaining({ clubId: 'club-123' }),
      );
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('sends update request and maps response', async () => {
      mockPutApiRolesId.mockResolvedValue(fullRoleResponse as never);

      const role = await roleDatasource.update(
        'role-1',
        'Manager',
        'Updated desc',
        true,
        false,
        null,
      );

      expect(mockPutApiRolesId).toHaveBeenCalledWith('role-1', {
        name: 'Manager',
        description: 'Updated desc',
        isElevated: true,
        isPortalRole: false,
      });
      expect(role.id).toBe('role-1');
    });

    it('sends clubId when provided on update', async () => {
      mockPutApiRolesId.mockResolvedValue(fullRoleResponse as never);

      await roleDatasource.update('role-1', 'Manager', null, false, false, 'club-456');

      expect(mockPutApiRolesId).toHaveBeenCalledWith(
        'role-1',
        expect.objectContaining({ clubId: 'club-456' }),
      );
    });
  });

  // ── deactivate ────────────────────────────────────────────────────────────

  describe('deactivate', () => {
    it('calls delete endpoint with role id', async () => {
      mockDeleteApiRolesId.mockResolvedValue(undefined as never);

      await roleDatasource.deactivate('role-1');

      expect(mockDeleteApiRolesId).toHaveBeenCalledWith('role-1');
    });
  });

  // ── updatePermissions ─────────────────────────────────────────────────────

  describe('updatePermissions', () => {
    it('sends permissions and maps response', async () => {
      const updated = { ...fullRoleResponse, permissions: ['Users.View'] };
      mockPutApiRolesIdPermissions.mockResolvedValue(updated as never);

      const role = await roleDatasource.updatePermissions('role-1', ['Users.View']);

      expect(mockPutApiRolesIdPermissions).toHaveBeenCalledWith('role-1', {
        permissions: ['Users.View'],
      });
      expect(role.permissions).toEqual(['Users.View']);
    });
  });

  // ── activate ─────────────────────────────────────────────────────────────

  describe('activate', () => {
    it('calls postApiRolesIdActivate with the role id', async () => {
      mockPostApiRolesIdActivate.mockResolvedValue(undefined as never);

      await roleDatasource.activate('role-1');

      expect(mockPostApiRolesIdActivate).toHaveBeenCalledWith('role-1');
    });
  });
});
