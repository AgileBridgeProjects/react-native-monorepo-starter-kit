import type { ClubResponse } from '@/proxy/models';

/**
 * Minimal club shape shared between the workspace switcher, flyout, and
 * list item. Extracted per docs/standards/frontend.md DRY rule.
 *
 * `id` and `name` are derived from the proxy so they cannot drift. `logoUrl`
 * widens to `string | null` (never undefined) so call sites coerce via
 * `?? null` once at the construction boundary.
 */
export type WorkspaceClubSummary = Pick<ClubResponse, 'id' | 'name'> & {
  logoUrl: string | null;
};
