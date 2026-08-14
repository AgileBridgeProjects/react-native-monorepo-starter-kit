// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { PhysicalHealthCondition } from './physicalHealthCondition';

export interface SubmitPhysicalHealthRequest {
  /** @minItems 1 */
  conditions: PhysicalHealthCondition[];
}
