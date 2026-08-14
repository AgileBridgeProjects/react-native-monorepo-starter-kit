// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { DiscTrait } from './discTrait';

export interface DiscProfileResponse {
  id: string;
  /** @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$ */
  dominance: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$ */
  influence: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$ */
  steadiness: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$ */
  conscientiousness: number | string;
  primaryStyle: DiscTrait;
  secondaryStyle: DiscTrait;
  retakeRequired: boolean;
  lastAssessedAt: string;
}
