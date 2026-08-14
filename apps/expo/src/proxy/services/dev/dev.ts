// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0

import { customInstance } from '../../../lib/http/orval-mutator';
import type { BootstrapPhoneResponse } from '../../models';

export const postApiDevBootstrapPhone = () => {
  return customInstance<BootstrapPhoneResponse>({
    url: `/api/dev/bootstrap-phone`,
    method: 'POST',
  });
};
export type PostApiDevBootstrapPhoneResult = NonNullable<
  Awaited<ReturnType<typeof postApiDevBootstrapPhone>>
>;
