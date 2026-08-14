import type { GridSortItem } from '@lib/http/create-grid-store';
import { createGridStore } from '@lib/http/create-grid-store';
import { toNumberOrNull } from '@starterkit/shared';
import { isAxiosError } from 'axios';
import type { ClubResponse, CreateClubRequest, UpdateClubRequest } from '@/proxy/models';
import {
  deleteApiClubsId,
  getApiClubs,
  getApiClubsId,
  getApiClubsUploadConstraints,
  postApiClubs,
  postApiClubsImages,
  putApiClubsId,
} from '@/proxy/services/clubs/clubs';
import type { Club } from '../../domain/entities/club';
import type { ClubOption } from '../../domain/entities/club-option';
import { ClubNotFoundFailure } from '../../domain/failures/club-failures';

// ─── Mapping ─────────────────────────────────────────────────────────────────

function toClub(dto: ClubResponse): Club {
  return {
    ...dto,
    maxAthletes: toNumberOrNull(dto.maxAthletes),
    activeUserCount: toNumberOrNull(dto.activeUserCount),
    teamCount: toNumberOrNull(dto.teamCount),
  };
}

// ─── Public types ──────────────────────────────────────────────────────────────

export interface ClubListResult {
  items: Club[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

// ─── Datasource ───────────────────────────────────────────────────────────────

export const clubDatasource = {
  async list(
    page: number,
    pageSize: number,
    filterText?: string,
    sort?: GridSortItem[],
  ): Promise<ClubListResult> {
    const primarySort = sort?.[0];
    const response = await getApiClubs({
      Page: page,
      PageSize: pageSize,
      FilterText: filterText,
      SortBy: primarySort?.selector,
      SortDescending: primarySort !== undefined ? primarySort.desc : false,
    });
    return {
      items: (response.items ?? []).map(toClub),
      totalCount: Number(response.totalCount ?? 0),
      page: Number(response.page ?? page),
      pageSize: Number(response.pageSize ?? pageSize),
      hasNextPage: response.hasNextPage ?? false,
    };
  },

  async getById(id: string): Promise<Club> {
    try {
      return toClub(await getApiClubsId(id));
    } catch (e) {
      if (isAxiosError(e) && e.response?.status === 404) throw new ClubNotFoundFailure(id);
      throw e;
    }
  },

  async create(input: CreateClubRequest): Promise<Club> {
    return toClub(await postApiClubs(input));
  },

  async uploadLogo(file: File): Promise<string> {
    const result = await postApiClubsImages({ file });
    return result.logoUrl;
  },

  async update(id: string, input: UpdateClubRequest): Promise<Club> {
    try {
      return toClub(await putApiClubsId(id, input));
    } catch (e) {
      if (isAxiosError(e) && e.response?.status === 404) throw new ClubNotFoundFailure(id);
      throw e;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await deleteApiClubsId(id);
    } catch (e) {
      if (isAxiosError(e) && e.response?.status === 404) throw new ClubNotFoundFailure(id);
      throw e;
    }
  },

  async listOptions(): Promise<ClubOption[]> {
    const response = await getApiClubs();
    return (response.items ?? []).map((c) => ({
      id: c.id as string,
      name: c.name as string,
    }));
  },

  async getUploadConstraints() {
    return getApiClubsUploadConstraints();
  },
};

// ─── Grid store ───────────────────────────────────────────────────────────────

/**
 * Singleton DevExtreme CustomStore for the Clubs grid.
 * Drives server-side paging and filtering via the createGridStore factory.
 * Import and pass directly as the `dataSource` prop of <EntityDataGrid>.
 * Call `clubStore.reload()` (instead of queryClient.invalidateQueries) to
 * refresh the grid after a mutation.
 */
export const clubStore = createGridStore<Club>((page, pageSize, filterText, sort) =>
  clubDatasource.list(page, pageSize, filterText, sort),
);
