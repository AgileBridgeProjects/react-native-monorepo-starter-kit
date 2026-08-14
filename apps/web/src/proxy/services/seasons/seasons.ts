// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0

import { customInstance } from '../../../lib/http/orval-mutator';
import type { CreateSeasonRequest, SeasonListResponse, SeasonResponse } from '../../models';

export const getApiClubsClubIdSeasons = (clubId: string) => {
  return customInstance<SeasonListResponse>({ url: `/api/clubs/${clubId}/seasons`, method: 'GET' });
};
export const postApiClubsClubIdSeasons = (
  clubId: string,
  createSeasonRequest: CreateSeasonRequest,
) => {
  return customInstance<SeasonResponse>({
    url: `/api/clubs/${clubId}/seasons`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: createSeasonRequest,
  });
};
export const getApiClubsClubIdSeasonsCurrent = (clubId: string) => {
  return customInstance<SeasonResponse>({
    url: `/api/clubs/${clubId}/seasons/current`,
    method: 'GET',
  });
};
export type GetApiClubsClubIdSeasonsResult = NonNullable<
  Awaited<ReturnType<typeof getApiClubsClubIdSeasons>>
>;
export type PostApiClubsClubIdSeasonsResult = NonNullable<
  Awaited<ReturnType<typeof postApiClubsClubIdSeasons>>
>;
export type GetApiClubsClubIdSeasonsCurrentResult = NonNullable<
  Awaited<ReturnType<typeof getApiClubsClubIdSeasonsCurrent>>
>;
