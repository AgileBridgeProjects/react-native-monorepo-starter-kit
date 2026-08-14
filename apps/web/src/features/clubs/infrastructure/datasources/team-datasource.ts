import type { GridSortItem } from '@lib/http/create-grid-store';
import { createGridStore } from '@lib/http/create-grid-store';
import type { AgeGroup, TeamResponse, UpdateTeamRequest } from '@/proxy/models';
import {
  deleteApiTeamsId,
  getApiTeams,
  postApiSeasonsSeasonIdTeams,
  putApiTeamsId,
} from '@/proxy/services/teams/teams';
import type { Team } from '../../domain/entities/team';

// ─── Mapping ─────────────────────────────────────────────────────────────────

function toTeam(dto: TeamResponse): Team {
  if (!dto.id || !dto.seasonId || !dto.name || !dto.createdAt) {
    throw new Error(
      `TeamResponse missing required fields: ${JSON.stringify({ id: dto.id, seasonId: dto.seasonId, name: dto.name, createdAt: dto.createdAt })}`,
    );
  }
  return {
    id: dto.id,
    seasonId: dto.seasonId,
    name: dto.name,
    description: dto.description ?? undefined,
    ageGroup: dto.ageGroup ?? undefined,
    logoUrl: dto.logoUrl ?? undefined,
    createdAt: dto.createdAt,
    createdBy: dto.createdBy ?? undefined,
    updatedAt: dto.updatedAt ?? undefined,
    updatedBy: dto.updatedBy ?? undefined,
  };
}

// ─── Public input types ──────────────────────────────────────────────────────

export interface TeamListResult {
  items: Team[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

export interface CreateTeamInput {
  seasonId: string;
  name: string;
  description?: string;
  ageGroup?: AgeGroup;
  logoUrl?: string;
}

// Re-export the proxy request type so consumers import from one place.
export type { UpdateTeamRequest as UpdateTeamInput };

// ─── Datasource ───────────────────────────────────────────────────────────────

export const teamDatasource = {
  async list(
    clubId: string,
    page: number,
    pageSize?: number,
    filterText?: string,
    sort?: GridSortItem[],
    seasonId?: string,
  ): Promise<TeamListResult> {
    const primarySort = sort?.[0];
    const response = await getApiTeams({
      ClubId: clubId,
      SeasonId: seasonId,
      Page: page,
      PageSize: pageSize,
      FilterText: filterText,
      SortBy: primarySort?.selector,
      SortDescending: primarySort !== undefined ? primarySort.desc : false,
    });
    return {
      items: (response.items ?? []).map(toTeam),
      totalCount: Number(response.totalCount ?? 0),
      page: Number(response.page ?? page),
      pageSize: Number(response.pageSize ?? pageSize ?? 0),
      hasNextPage: response.hasNextPage ?? false,
    };
  },

  async create(input: CreateTeamInput): Promise<Team> {
    const dto = await postApiSeasonsSeasonIdTeams(input.seasonId, {
      name: input.name,
      description: input.description,
      ageGroup: input.ageGroup,
      logoUrl: input.logoUrl,
    });
    return toTeam(dto);
  },

  async update(id: string, input: UpdateTeamRequest): Promise<Team> {
    const dto = await putApiTeamsId(id, {
      name: input.name,
      description: input.description,
      ageGroup: input.ageGroup,
      logoUrl: input.logoUrl,
    });
    return toTeam(dto);
  },

  async delete(id: string): Promise<void> {
    await deleteApiTeamsId(id);
  },
};

// ─── Grid store factory ───────────────────────────────────────────────────────

/**
 * Creates a DevExtreme DataSource for the Teams list, scoped to a club and (optionally) a
 * specific season. Recreate (don't mutate) the store when `seasonId` changes — pass a new
 * instance to `<EntityDataGrid>` to trigger a fresh load; `store.reload()` is for post-mutation
 * refreshes with the same filters.
 */
export function createTeamStore(clubId: string, seasonId?: string) {
  return createGridStore<Team>((page, pageSize, filterText, sort) =>
    teamDatasource.list(clubId, page, pageSize, filterText, sort, seasonId),
  );
}
