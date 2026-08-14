// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { ExcludedRowResponse } from './excludedRowResponse';
import type { MatchedPlayerRowResponse } from './matchedPlayerRowResponse';
import type { RosterAthleteResponse } from './rosterAthleteResponse';
import type { UnmatchedPlayerRowResponse } from './unmatchedPlayerRowResponse';

export interface StatsImportPreviewResponse {
  teamCalendarEventId: string;
  matchedRows: MatchedPlayerRowResponse[];
  unmatchedRows: UnmatchedPlayerRowResponse[];
  excludedRows: ExcludedRowResponse[];
  unrecognizedHeaders: string[];
  hasActiveImport: boolean;
  rosterAthletes: RosterAthleteResponse[];
}
