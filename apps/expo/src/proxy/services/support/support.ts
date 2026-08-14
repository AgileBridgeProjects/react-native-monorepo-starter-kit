// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0

import { customInstance } from '../../../lib/http/orval-mutator';
import type { HelpRequest } from '../../models';

export const postApiSupportHelp = (helpRequest: HelpRequest) => {
  return customInstance<void>({
    url: `/api/support/help`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: helpRequest,
  });
};
export type PostApiSupportHelpResult = NonNullable<Awaited<ReturnType<typeof postApiSupportHelp>>>;
