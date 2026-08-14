// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0

import { customInstance } from '../../../lib/http/orval-mutator';
import type { MeResponse } from '../../models';

export const getApiAuthMe = () => {
  return customInstance<MeResponse>({ url: `/api/auth/me`, method: 'GET' });
};
export const postApiAuthRevokeSessions = () => {
  return customInstance<void>({ url: `/api/auth/revoke-sessions`, method: 'POST' });
};
export type GetApiAuthMeResult = NonNullable<Awaited<ReturnType<typeof getApiAuthMe>>>;
export type PostApiAuthRevokeSessionsResult = NonNullable<
  Awaited<ReturnType<typeof postApiAuthRevokeSessions>>
>;
