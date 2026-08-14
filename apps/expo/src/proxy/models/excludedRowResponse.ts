// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { ExcludedRowReason } from './excludedRowReason';

export interface ExcludedRowResponse {
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  rowIndex: number | string;
  name: string;
  reason: ExcludedRowReason;
}
