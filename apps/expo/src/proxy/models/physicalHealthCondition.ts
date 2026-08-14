// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { BodyArea } from './bodyArea';
import type { PhysicalHealthIndicator } from './physicalHealthIndicator';
import type { SelfReportStatus } from './selfReportStatus';

export interface PhysicalHealthCondition {
  indicator: PhysicalHealthIndicator;
  bodyArea?: null | BodyArea;
  status: SelfReportStatus;
  /**
   * @maxLength 1000
   * @nullable
   */
  description?: string | null;
}
