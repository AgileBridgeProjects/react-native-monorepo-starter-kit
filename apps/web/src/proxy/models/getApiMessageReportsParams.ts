// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import type { MessageReportReason } from './messageReportReason';
import type { MessageReportStatus } from './messageReportStatus';
import type { ReportTargetType } from './reportTargetType';

export type GetApiMessageReportsParams = {
  Status?: MessageReportStatus;
  TargetType?: ReportTargetType;
  Reason?: MessageReportReason;
  ReportedUserId?: string;
  From?: string;
  To?: string;
  EffectiveSortDescending?: boolean;
  /**
   * @minLength 0
   * @maxLength 200
   */
  FilterText?: string;
  SortBy?: string;
  SortDescending?: boolean;
  /**
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  Page?: number | string;
  /**
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  PageSize?: number | string;
  /**
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  ClampedPage?: number | string;
  /**
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  ClampedPageSize?: number | string;
};
