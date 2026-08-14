import type { SeasonResponse } from '@/proxy/models';

// Derived from the proxy DTO so the two types cannot drift.
export type Season = Required<
  Pick<SeasonResponse, 'id' | 'clubId' | 'startDate' | 'endDate' | 'displayLabel'>
> & {
  name?: string;
};
