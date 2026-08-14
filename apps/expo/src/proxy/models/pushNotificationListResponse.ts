// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { PushNotificationResponse } from './pushNotificationResponse';

export interface PushNotificationListResponse {
  items?: PushNotificationResponse[];
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  totalCount?: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  unreadCount?: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  page?: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  pageSize?: number | string;
}
