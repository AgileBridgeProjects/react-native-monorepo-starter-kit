import type { SeasonResponse } from '@/proxy/models';
import {
  getApiClubsClubIdSeasons,
  getApiClubsClubIdSeasonsCurrent,
  postApiClubsClubIdSeasons,
} from '@/proxy/services/seasons/seasons';
import type { Season } from '../../domain/entities/season';

// ─── Mapping ─────────────────────────────────────────────────────────────────

function toSeason(dto: SeasonResponse): Season {
  if (!dto.id || !dto.clubId || !dto.startDate || !dto.endDate || !dto.displayLabel) {
    throw new Error(`SeasonResponse missing required fields: ${JSON.stringify(dto)}`);
  }
  return {
    id: dto.id,
    clubId: dto.clubId,
    name: dto.name ?? undefined,
    startDate: dto.startDate,
    endDate: dto.endDate,
    displayLabel: dto.displayLabel,
  };
}

// ─── Public input types ──────────────────────────────────────────────────────

export interface CreateSeasonInput {
  name?: string;
  startDate: string;
  endDate: string;
  /**
   * Reserved for a future "clone team structure from prior season" feature — accepted by the
   * API for contract stability but currently a no-op; no teams are copied yet.
   */
  cloneTeamsFromSeasonId?: string;
}

// ─── Datasource ───────────────────────────────────────────────────────────────

export const seasonDatasource = {
  /** Lists all seasons for a club, newest first. */
  async list(clubId: string): Promise<Season[]> {
    const response = await getApiClubsClubIdSeasons(clubId);
    return (response.items ?? []).map(toSeason);
  },

  /**
   * Returns the club's current season (creating a default calendar-year season
   * server-side if the club doesn't have one yet).
   */
  async getCurrent(clubId: string): Promise<Season> {
    return toSeason(await getApiClubsClubIdSeasonsCurrent(clubId));
  },

  /** Explicitly creates a new season for a club (the "Add Season" admin action). */
  async create(clubId: string, input: CreateSeasonInput): Promise<Season> {
    return toSeason(
      await postApiClubsClubIdSeasons(clubId, {
        name: input.name || undefined,
        startDate: input.startDate,
        endDate: input.endDate,
        cloneTeamsFromSeasonId: input.cloneTeamsFromSeasonId,
      }),
    );
  },
};
