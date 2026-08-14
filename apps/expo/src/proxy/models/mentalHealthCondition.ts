// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { MentalHealthIndicator } from './mentalHealthIndicator';
import type { SelfReportStatus } from './selfReportStatus';

export interface MentalHealthCondition {
  indicator: MentalHealthIndicator;
  status: SelfReportStatus;
  /**
   * @maxLength 1000
   * @nullable
   */
  description?: string | null;
}
