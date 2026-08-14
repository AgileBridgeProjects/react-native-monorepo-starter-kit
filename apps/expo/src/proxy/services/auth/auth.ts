// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0

import { customInstance } from '../../../lib/http/orval-mutator';
import type { LinkedOrganisationDto, MeResponse, UpdateDisplayNameRequest } from '../../models';

export const getApiAuthMe = () => {
  return customInstance<MeResponse>({ url: `/api/auth/me`, method: 'GET' });
};
export const patchApiAuthMeDisplayName = (updateDisplayNameRequest: UpdateDisplayNameRequest) => {
  return customInstance<void>({
    url: `/api/auth/me/display-name`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    data: updateDisplayNameRequest,
  });
};
export const getApiAuthMeOrganisations = () => {
  return customInstance<LinkedOrganisationDto[]>({
    url: `/api/auth/me/organisations`,
    method: 'GET',
  });
};
export type GetApiAuthMeResult = NonNullable<Awaited<ReturnType<typeof getApiAuthMe>>>;
export type PatchApiAuthMeDisplayNameResult = NonNullable<
  Awaited<ReturnType<typeof patchApiAuthMeDisplayName>>
>;
export type GetApiAuthMeOrganisationsResult = NonNullable<
  Awaited<ReturnType<typeof getApiAuthMeOrganisations>>
>;
