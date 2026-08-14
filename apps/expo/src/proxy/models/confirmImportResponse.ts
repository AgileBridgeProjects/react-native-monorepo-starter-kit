// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { ConfirmImportOutcome } from './confirmImportOutcome';

export interface ConfirmImportResponse {
  outcome: ConfirmImportOutcome;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  persistedCount?: number | string;
}
