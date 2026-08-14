// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import type { PagedResultOfTeamReportItemDto } from './pagedResultOfTeamReportItemDto';

export interface TeamsReportDto {
  teams?: PagedResultOfTeamReportItemDto;
  /** @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$ */
  weightedAverageParticipationRate?: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$ */
  unweightedAverageParticipationRate?: number | string;
}
