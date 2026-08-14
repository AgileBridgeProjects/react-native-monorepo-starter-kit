// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0

import { customInstance } from '../../../lib/http/orval-mutator';
import type {
  GetApiPushNotificationsParams,
  PushNotificationListResponse,
  PushNotificationResponse,
} from '../../models';

export const getApiPushNotifications = (params?: GetApiPushNotificationsParams) => {
  return customInstance<PushNotificationListResponse>({
    url: `/api/push-notifications`,
    method: 'GET',
    params,
  });
};
export const getApiPushNotificationsId = (id: string) => {
  return customInstance<PushNotificationResponse>({
    url: `/api/push-notifications/${id}`,
    method: 'GET',
  });
};
export const patchApiPushNotificationsIdRead = (id: string) => {
  return customInstance<void>({ url: `/api/push-notifications/${id}/read`, method: 'PATCH' });
};
export const patchApiPushNotificationsReadAll = () => {
  return customInstance<void>({ url: `/api/push-notifications/read-all`, method: 'PATCH' });
};
export const patchApiPushNotificationsIdSeen = (id: string) => {
  return customInstance<void>({ url: `/api/push-notifications/${id}/seen`, method: 'PATCH' });
};
export type GetApiPushNotificationsResult = NonNullable<
  Awaited<ReturnType<typeof getApiPushNotifications>>
>;
export type GetApiPushNotificationsIdResult = NonNullable<
  Awaited<ReturnType<typeof getApiPushNotificationsId>>
>;
export type PatchApiPushNotificationsIdReadResult = NonNullable<
  Awaited<ReturnType<typeof patchApiPushNotificationsIdRead>>
>;
export type PatchApiPushNotificationsReadAllResult = NonNullable<
  Awaited<ReturnType<typeof patchApiPushNotificationsReadAll>>
>;
export type PatchApiPushNotificationsIdSeenResult = NonNullable<
  Awaited<ReturnType<typeof patchApiPushNotificationsIdSeen>>
>;
