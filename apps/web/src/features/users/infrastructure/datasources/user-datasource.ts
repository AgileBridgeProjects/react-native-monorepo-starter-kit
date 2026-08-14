import { teamDatasource } from '@features/clubs/infrastructure/datasources/team-datasource';
import type { GridSortItem } from '@lib/http/create-grid-store';
import { createGridStore } from '@lib/http/create-grid-store';
import type {
  AdminChangePasswordRequest,
  AdminCreateUserRequest,
  BulkUploadConfirmRequest,
  BulkUploadConfirmResponse,
  BulkUploadPreviewResponse,
  CompleteSetupRequest,
  UpdateUserRequest,
  UserDefaultsResponse,
  UserResponse,
  ValidateSetupTokenResponse,
} from '@/proxy/models';
import { AuthenticationMethod, SetupStatus } from '@/proxy/models';
import {
  deleteApiUsersId,
  deleteApiUsersIdAvatar,
  getApiUsers,
  getApiUsersBulkUploadTemplate,
  getApiUsersDefaults,
  getApiUsersExport,
  getApiUsersId,
  getApiUsersSetupValidate,
  postApiUsers,
  postApiUsersBulkUploadConfirm,
  postApiUsersBulkUploadPreview,
  postApiUsersIdChangePassword,
  postApiUsersIdLinkClub,
  postApiUsersIdResendSetup,
  postApiUsersSetupComplete,
  postApiUsersSetupPasswordResetRequest,
  putApiUsersId,
} from '@/proxy/services/users/users';
import type { SelectOption } from '@/types/select-option';
import type { User } from '../../domain/entities/user';

// ─── Mapping ─────────────────────────────────────────────────────────────────

function toUser(dto: UserResponse): User {
  const missingFields: string[] = [];
  if (!dto.id) missingFields.push('id');
  if (!dto.clubId) missingFields.push('clubId');
  if (dto.displayName == null) missingFields.push('displayName');
  if (!dto.createdAt) missingFields.push('createdAt');
  if (dto.isActive == null) missingFields.push('isActive');
  if (missingFields.length > 0) {
    throw new Error(`UserResponse missing required fields: ${missingFields.join(', ')}`);
  }
  return {
    id: dto.id as string,
    clubId: dto.clubId as string,
    avatarUrl: dto.avatarUrl ?? null,
    email: dto.email ?? null,
    phoneNumber: dto.phoneNumber ?? null,
    username: dto.username ?? null,
    authMethod: dto.authMethod ?? AuthenticationMethod.Credentials,
    displayName: dto.displayName as string,
    isActive: dto.isActive as boolean,
    createdAt: dto.createdAt as string,
    lastLoginAt: dto.lastLoginAt ?? null,
    dateOfBirth: dto.dateOfBirth ?? null,
    position: dto.position ?? null,
    jerseyNumber: dto.jerseyNumber ?? null,
    teamIds: dto.teamIds ?? [],
    dependentUserIds: dto.dependentUserIds ?? [],
    roles: dto.roles ?? [],
    isSharedAcrossClubs: dto.isSharedAcrossClubs ?? false,
    setupStatus: dto.setupStatus ?? SetupStatus.None,
  };
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface UserListResult {
  items: User[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

export interface UserListFilter {
  clubId?: string;
  teamId?: string;
  isActive?: boolean;
  authMethod?: AuthenticationMethod;
  roleName?: string;
  /** Filter by setup status. Undefined = all users. */
  setupStatus?: SetupStatus;
}

// ─── Datasource ───────────────────────────────────────────────────────────────

export const userDatasource = {
  async list(
    page: number,
    pageSize: number,
    filterText?: string,
    sort?: GridSortItem[],
    filter?: UserListFilter,
  ): Promise<UserListResult> {
    const primarySort = sort?.[0];
    const response = await getApiUsers({
      ClubId: filter?.clubId,
      TeamId: filter?.teamId,
      IsActive: filter?.isActive,
      Page: page,
      PageSize: pageSize,
      FilterText: filterText,
      SortBy: primarySort?.selector,
      SortDescending: primarySort?.desc,
      AuthMethod: filter?.authMethod,
      RoleName: filter?.roleName,
      SetupStatus: filter?.setupStatus,
    });

    return {
      items: (response.items ?? []).map(toUser),
      totalCount: Number(response.totalCount ?? 0),
      page: Number(response.page ?? page),
      pageSize: Number(response.pageSize ?? pageSize),
      hasNextPage: response.hasNextPage ?? false,
    };
  },

  async listTeams(clubId: string): Promise<SelectOption[]> {
    const response = await teamDatasource.list(clubId, 1, 500);
    return response.items.map((d) => ({ id: d.id, name: d.name }));
  },

  async create(input: AdminCreateUserRequest): Promise<{ user: User; setupLink: string | null }> {
    const dto = await postApiUsers(input);
    return { user: toUser(dto), setupLink: dto.setupLink ?? null };
  },

  async linkToClub(userId: string, clubId: string, role: string): Promise<User> {
    const dto = await postApiUsersIdLinkClub(userId, { clubId, role });
    return toUser(dto);
  },

  async getById(id: string): Promise<User> {
    const dto = await getApiUsersId(id);
    return toUser(dto);
  },

  async update(id: string, input: UpdateUserRequest): Promise<User> {
    const dto = await putApiUsersId(id, input);
    return toUser(dto);
  },

  async remove(id: string): Promise<void> {
    await deleteApiUsersId(id);
  },

  async removeAvatar(id: string): Promise<void> {
    await deleteApiUsersIdAvatar(id);
  },

  async validateSetupToken(token: string): Promise<ValidateSetupTokenResponse> {
    return getApiUsersSetupValidate({ token });
  },

  async completeSetup(input: CompleteSetupRequest): Promise<void> {
    await postApiUsersSetupComplete(input);
  },

  async resendSetup(id: string): Promise<string> {
    const response = await postApiUsersIdResendSetup(id);
    return response.setupLink ?? '';
  },

  async requestPasswordReset(email: string): Promise<string | null> {
    const result = await postApiUsersSetupPasswordResetRequest({ email });
    return result?.resetLink ?? null;
  },

  async getDefaults(): Promise<UserDefaultsResponse> {
    return getApiUsersDefaults();
  },

  async adminChangePassword(userId: string, request: AdminChangePasswordRequest): Promise<void> {
    await postApiUsersIdChangePassword(userId, request);
  },

  async getBulkUploadTemplate(clubId: string): Promise<Blob> {
    return getApiUsersBulkUploadTemplate({ clubId });
  },

  async previewBulkUpload(
    clubId: string,
    file: File,
    teamId?: string,
  ): Promise<BulkUploadPreviewResponse> {
    return postApiUsersBulkUploadPreview({ File: file }, { clubId, ...(teamId ? { teamId } : {}) });
  },

  async confirmBulkUpload(request: BulkUploadConfirmRequest): Promise<BulkUploadConfirmResponse> {
    return postApiUsersBulkUploadConfirm(request);
  },

  async exportUsers(clubId: string, teamId?: string): Promise<Blob> {
    return getApiUsersExport({ clubId, ...(teamId ? { teamId } : {}) });
  },
};

// ─── Grid store factory ───────────────────────────────────────────────────────

/**
 * Creates a DevExtreme DataSource for the users grid scoped to the given filter.
 * Call `store.reload()` after filter changes or mutations to refresh the grid.
 *
 * Usage:
 *   const store = createUserGridStore({ clubId, teamId });
 *   <EntityDataGrid dataSource={store} columns={columns} />
 */
export function createUserGridStore(filter: UserListFilter) {
  return createGridStore<User>((page, pageSize, filterText, sort) =>
    userDatasource.list(page, pageSize, filterText, sort, filter),
  );
}
