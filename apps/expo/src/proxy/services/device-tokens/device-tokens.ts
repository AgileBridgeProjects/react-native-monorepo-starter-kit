// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0

import { customInstance } from '../../../lib/http/orval-mutator';
import type { RegisterDeviceTokenRequest } from '../../models';

export const postApiDeviceTokens = (registerDeviceTokenRequest: RegisterDeviceTokenRequest) => {
  return customInstance<void>({
    url: `/api/device-tokens`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: registerDeviceTokenRequest,
  });
};
export type PostApiDeviceTokensResult = NonNullable<
  Awaited<ReturnType<typeof postApiDeviceTokens>>
>;
