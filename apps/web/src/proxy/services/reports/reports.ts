// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0

import { blobInstance, customInstance } from '../../../lib/http/orval-mutator';
import type {
  AddExclusionRequest,
  CreateLeaveRequest,
  ExclusionDto,
  GetApiReportsSummaryExportParams,
  GetApiReportsSummaryParams,
  GetApiReportsSummaryTrendsParams,
  GetApiReportsTeamsExportParams,
  GetApiReportsTeamsParams,
  GetApiReportsTeamsTrendsParams,
  LeaveRecordDto,
  SummaryReportDto,
  TeamsReportDto,
  TeamTrendDto,
  TrendReportDto,
} from '../../models';

export const getApiReportsSummary = (params?: GetApiReportsSummaryParams) => {
  return customInstance<SummaryReportDto>({ url: `/api/reports/summary`, method: 'GET', params });
};
export const getApiReportsSummaryExport = (params?: GetApiReportsSummaryExportParams) => {
  return blobInstance<void>({ url: `/api/reports/summary/export`, method: 'GET', params });
};
export const getApiReportsSummaryTrends = (params?: GetApiReportsSummaryTrendsParams) => {
  return customInstance<TrendReportDto>({
    url: `/api/reports/summary/trends`,
    method: 'GET',
    params,
  });
};
export const postApiReportsRefresh = () => {
  return customInstance<void>({ url: `/api/reports/refresh`, method: 'POST' });
};
export const getApiReportsPlayersExclusions = () => {
  return customInstance<ExclusionDto[]>({ url: `/api/reports/players/exclusions`, method: 'GET' });
};
export const postApiReportsPlayersUserIdExclusions = (
  userId: string,
  addExclusionRequest: AddExclusionRequest,
) => {
  return customInstance<void>({
    url: `/api/reports/players/${userId}/exclusions`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: addExclusionRequest,
  });
};
export const deleteApiReportsPlayersUserIdExclusions = (userId: string) => {
  return customInstance<void>({
    url: `/api/reports/players/${userId}/exclusions`,
    method: 'DELETE',
  });
};
export const getApiReportsPlayersLeave = () => {
  return customInstance<LeaveRecordDto[]>({ url: `/api/reports/players/leave`, method: 'GET' });
};
export const postApiReportsPlayersLeave = (createLeaveRequest: CreateLeaveRequest) => {
  return customInstance<LeaveRecordDto>({
    url: `/api/reports/players/leave`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: createLeaveRequest,
  });
};
export const deleteApiReportsPlayersLeaveId = (id: string) => {
  return customInstance<void>({ url: `/api/reports/players/leave/${id}`, method: 'DELETE' });
};
export const getApiReportsTeams = (params?: GetApiReportsTeamsParams) => {
  return customInstance<TeamsReportDto>({ url: `/api/reports/teams`, method: 'GET', params });
};
export const getApiReportsTeamsExport = (params?: GetApiReportsTeamsExportParams) => {
  return blobInstance<void>({ url: `/api/reports/teams/export`, method: 'GET', params });
};
export const getApiReportsTeamsTrends = (params?: GetApiReportsTeamsTrendsParams) => {
  return customInstance<TeamTrendDto[]>({
    url: `/api/reports/teams/trends`,
    method: 'GET',
    params,
  });
};
export type GetApiReportsSummaryResult = NonNullable<
  Awaited<ReturnType<typeof getApiReportsSummary>>
>;
export type GetApiReportsSummaryExportResult = NonNullable<
  Awaited<ReturnType<typeof getApiReportsSummaryExport>>
>;
export type GetApiReportsSummaryTrendsResult = NonNullable<
  Awaited<ReturnType<typeof getApiReportsSummaryTrends>>
>;
export type PostApiReportsRefreshResult = NonNullable<
  Awaited<ReturnType<typeof postApiReportsRefresh>>
>;
export type GetApiReportsPlayersExclusionsResult = NonNullable<
  Awaited<ReturnType<typeof getApiReportsPlayersExclusions>>
>;
export type PostApiReportsPlayersUserIdExclusionsResult = NonNullable<
  Awaited<ReturnType<typeof postApiReportsPlayersUserIdExclusions>>
>;
export type DeleteApiReportsPlayersUserIdExclusionsResult = NonNullable<
  Awaited<ReturnType<typeof deleteApiReportsPlayersUserIdExclusions>>
>;
export type GetApiReportsPlayersLeaveResult = NonNullable<
  Awaited<ReturnType<typeof getApiReportsPlayersLeave>>
>;
export type PostApiReportsPlayersLeaveResult = NonNullable<
  Awaited<ReturnType<typeof postApiReportsPlayersLeave>>
>;
export type DeleteApiReportsPlayersLeaveIdResult = NonNullable<
  Awaited<ReturnType<typeof deleteApiReportsPlayersLeaveId>>
>;
export type GetApiReportsTeamsResult = NonNullable<Awaited<ReturnType<typeof getApiReportsTeams>>>;
export type GetApiReportsTeamsExportResult = NonNullable<
  Awaited<ReturnType<typeof getApiReportsTeamsExport>>
>;
export type GetApiReportsTeamsTrendsResult = NonNullable<
  Awaited<ReturnType<typeof getApiReportsTeamsTrends>>
>;
