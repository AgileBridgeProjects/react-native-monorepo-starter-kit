// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0

import { customInstance } from '../../../lib/http/orval-mutator';
import type {
  CreateNotificationMessageRequest,
  GetApiNotificationsMessagesParams,
  NotificationMessageListResponse,
  NotificationMessageResponse,
  SendEmailRequest,
  SendEmailResponse,
  SendNotificationRequest,
  SendSmsRequest,
  SendSmsResponse,
  UpdateNotificationMessageRequest,
} from '../../models';

export const postApiNotificationsSendEmail = (sendEmailRequest: SendEmailRequest) => {
  return customInstance<SendEmailResponse>({
    url: `/api/notifications/send-email`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: sendEmailRequest,
  });
};
export const postApiNotificationsSendSms = (sendSmsRequest: SendSmsRequest) => {
  return customInstance<SendSmsResponse>({
    url: `/api/notifications/send-sms`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: sendSmsRequest,
  });
};
export const getApiNotificationsMessages = (params?: GetApiNotificationsMessagesParams) => {
  return customInstance<NotificationMessageListResponse>({
    url: `/api/notifications/messages`,
    method: 'GET',
    params,
  });
};
export const postApiNotificationsMessages = (
  createNotificationMessageRequest: CreateNotificationMessageRequest,
) => {
  return customInstance<NotificationMessageResponse>({
    url: `/api/notifications/messages`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: createNotificationMessageRequest,
  });
};
export const getApiNotificationsMessagesId = (id: string) => {
  return customInstance<NotificationMessageResponse>({
    url: `/api/notifications/messages/${id}`,
    method: 'GET',
  });
};
export const putApiNotificationsMessagesId = (
  id: string,
  updateNotificationMessageRequest: UpdateNotificationMessageRequest,
) => {
  return customInstance<NotificationMessageResponse>({
    url: `/api/notifications/messages/${id}`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    data: updateNotificationMessageRequest,
  });
};
export const deleteApiNotificationsMessagesId = (id: string) => {
  return customInstance<void>({ url: `/api/notifications/messages/${id}`, method: 'DELETE' });
};
export const postApiNotificationsMessagesIdSend = (
  id: string,
  nullSendNotificationRequest?: null | SendNotificationRequest,
) => {
  return customInstance<NotificationMessageResponse>({
    url: `/api/notifications/messages/${id}/send`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: nullSendNotificationRequest,
  });
};
export type PostApiNotificationsSendEmailResult = NonNullable<
  Awaited<ReturnType<typeof postApiNotificationsSendEmail>>
>;
export type PostApiNotificationsSendSmsResult = NonNullable<
  Awaited<ReturnType<typeof postApiNotificationsSendSms>>
>;
export type GetApiNotificationsMessagesResult = NonNullable<
  Awaited<ReturnType<typeof getApiNotificationsMessages>>
>;
export type PostApiNotificationsMessagesResult = NonNullable<
  Awaited<ReturnType<typeof postApiNotificationsMessages>>
>;
export type GetApiNotificationsMessagesIdResult = NonNullable<
  Awaited<ReturnType<typeof getApiNotificationsMessagesId>>
>;
export type PutApiNotificationsMessagesIdResult = NonNullable<
  Awaited<ReturnType<typeof putApiNotificationsMessagesId>>
>;
export type DeleteApiNotificationsMessagesIdResult = NonNullable<
  Awaited<ReturnType<typeof deleteApiNotificationsMessagesId>>
>;
export type PostApiNotificationsMessagesIdSendResult = NonNullable<
  Awaited<ReturnType<typeof postApiNotificationsMessagesIdSend>>
>;
