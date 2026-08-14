import { z } from 'zod';
import { AgeGroup } from '@/proxy/models';

export const TEAM_NAME_MAX = 100;
export const TEAM_DESCRIPTION_MAX = 500;

/** Fixed age-group bands offered on team creation/edit — U10 through U18. Sourced from the
 *  backend's AgeGroup enum (proxy-generated) rather than hand-rolled, per the no-duplication rule. */
export const AGE_GROUPS = Object.values(AgeGroup) as [AgeGroup, ...AgeGroup[]];

export const teamSchema = z.object({
  name: z.string().min(1, 'errors:team.name.required').max(TEAM_NAME_MAX, 'errors:team.name.max'),
  description: z
    .string()
    .max(TEAM_DESCRIPTION_MAX, 'errors:team.description.max')
    .optional()
    .or(z.literal('')),
  ageGroup: z.enum(AGE_GROUPS).optional().or(z.literal('')),
  // Server-set via the shared image upload; not a user-typed field.
  logoUrl: z.string().optional().nullable().or(z.literal('')),
});

export type TeamFormData = z.infer<typeof teamSchema>;
