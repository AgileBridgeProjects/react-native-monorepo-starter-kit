// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { BurnoutIndicatorType } from './burnoutIndicatorType';
import type { SelfReportStatus } from './selfReportStatus';

export interface BurnoutIndicatorCondition {
  indicator: BurnoutIndicatorType;
  status: SelfReportStatus;
  /**
   * @maxLength 1000
   * @nullable
   */
  description?: string | null;
}
