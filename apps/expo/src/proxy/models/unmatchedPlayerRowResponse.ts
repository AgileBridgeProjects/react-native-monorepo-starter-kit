// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { UnmatchedPlayerRowResponsePayload } from './unmatchedPlayerRowResponsePayload';

export interface UnmatchedPlayerRowResponse {
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  rowIndex: number | string;
  name: string;
  payload: UnmatchedPlayerRowResponsePayload;
}
