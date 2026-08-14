// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { MessageReportReason } from './messageReportReason';
import type { ReportTargetType } from './reportTargetType';

export interface ReportMessageRequest {
  targetType: ReportTargetType;
  reason?: null | MessageReportReason;
  /** @nullable */
  comment?: string | null;
}
