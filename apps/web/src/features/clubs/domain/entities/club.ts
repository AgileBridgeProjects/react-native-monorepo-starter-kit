import type { ClubResponse } from '@/proxy/models';

/**
 * Domain shape for a club. Derived from the proxy `ClubResponse` per
 * docs/standards/frontend.md — "Domain types — no duplication rule".
 *
 * The only deviation from the proxy is integer fields, which OpenAPI emits as
 * `number | string` because of the `pattern: "^-?(?:0|[1-9]\\d*)$"` annotation
 * on int? properties. Backend serialisation always produces `number`, so we
 * narrow those fields here and `toClub` in the datasource is the single
 * place that coerces them.
 */
export type Club = Omit<ClubResponse, 'maxAthletes' | 'activeUserCount' | 'teamCount'> & {
  maxAthletes: number | null;
  activeUserCount: number | null;
  teamCount: number | null;
};
