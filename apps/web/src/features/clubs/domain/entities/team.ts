import type { AgeGroup, TeamResponse } from '@/proxy/models';

// Derived from the proxy DTO so the two types cannot drift.
export type Team = Required<Pick<TeamResponse, 'id' | 'seasonId' | 'name' | 'createdAt'>> & {
  description?: string;
  ageGroup?: AgeGroup;
  logoUrl?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
};
