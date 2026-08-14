// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0

import { customInstance } from '../../../lib/http/orval-mutator';
import type {
  CreateTeamRequest,
  GetApiTeamsParams,
  TeamListResponse,
  TeamResponse,
  UpdateTeamRequest,
} from '../../models';

export const getApiTeams = (params?: GetApiTeamsParams) => {
  return customInstance<TeamListResponse>({ url: `/api/teams`, method: 'GET', params });
};
export const getApiTeamsId = (id: string) => {
  return customInstance<TeamResponse>({ url: `/api/teams/${id}`, method: 'GET' });
};
export const putApiTeamsId = (id: string, updateTeamRequest: UpdateTeamRequest) => {
  return customInstance<TeamResponse>({
    url: `/api/teams/${id}`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    data: updateTeamRequest,
  });
};
export const deleteApiTeamsId = (id: string) => {
  return customInstance<void>({ url: `/api/teams/${id}`, method: 'DELETE' });
};
export const postApiSeasonsSeasonIdTeams = (
  seasonId: string,
  createTeamRequest: CreateTeamRequest,
) => {
  return customInstance<TeamResponse>({
    url: `/api/seasons/${seasonId}/teams`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: createTeamRequest,
  });
};
export type GetApiTeamsResult = NonNullable<Awaited<ReturnType<typeof getApiTeams>>>;
export type GetApiTeamsIdResult = NonNullable<Awaited<ReturnType<typeof getApiTeamsId>>>;
export type PutApiTeamsIdResult = NonNullable<Awaited<ReturnType<typeof putApiTeamsId>>>;
export type DeleteApiTeamsIdResult = NonNullable<Awaited<ReturnType<typeof deleteApiTeamsId>>>;
export type PostApiSeasonsSeasonIdTeamsResult = NonNullable<
  Awaited<ReturnType<typeof postApiSeasonsSeasonIdTeams>>
>;
