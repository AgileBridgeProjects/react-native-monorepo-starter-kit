import { z } from 'zod';
import { AGE_GROUPS, TEAM_NAME_MAX } from './team-schema';

export const CLUB_NAME_MAX = 100;
export const CLUB_STREET_ADDRESS_MAX = 200;
export const CLUB_CITY_MAX = 100;
export const CLUB_TIMEZONE_MAX = 100;
export const CLUB_SEASON_NAME_MAX = 100;

export const clubSchema = z.object({
  name: z.string().min(1, 'errors:club.name.required').max(CLUB_NAME_MAX, 'errors:club.name.max'),
  streetAddress: z
    .string()
    .min(1, 'errors:club.streetAddress.required')
    .max(CLUB_STREET_ADDRESS_MAX, 'errors:club.streetAddress.max'),
  city: z.string().min(1, 'errors:club.city.required').max(CLUB_CITY_MAX, 'errors:club.city.max'),
  // Two-letter USPS code chosen from the state picker. Also narrows the timezone choices,
  // but never derives the stored timezone.
  state: z.string().regex(/^[A-Z]{2}$/, 'errors:club.state.required'),
  zipCode: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, 'errors:club.zipCode.format')
    .optional()
    .nullable()
    .or(z.literal('')),
  // Optional IANA time-zone id — value comes from the US timezone picker.
  timezone: z
    .string()
    .max(CLUB_TIMEZONE_MAX, 'errors:club.timezone.max')
    .optional()
    .nullable()
    .or(z.literal('')),
  maxAthletes: z.number().int().min(1, 'errors:club.maxAthletes.min').optional().nullable(),
  // logoUrl is server-set (returned by the upload endpoint), not user input — skip .url() validation.
  logoUrl: z.string().optional().nullable().or(z.literal('')),
  // Season is only defined at club-creation time — kept optional here (rather than
  // required) so this shared schema doesn't block the edit form, which never populates these
  // fields. The create flow enforces presence separately (see clubs-page.tsx).
  seasonName: z
    .string()
    .max(CLUB_SEASON_NAME_MAX, 'errors:club.seasonName.max')
    .optional()
    .or(z.literal('')),
  seasonStartDate: z.string().optional().or(z.literal('')),
  seasonEndDate: z.string().optional().or(z.literal('')),
  // Optional teams created alongside the club's first season (name + age group + optional logo).
  // More can be added later from the standalone Teams page.
  teams: z
    .array(
      z.object({
        name: z.string().max(TEAM_NAME_MAX),
        ageGroup: z.enum(AGE_GROUPS).optional().or(z.literal('')),
        // Server-set via the shared image upload; not a user-typed field.
        logoUrl: z.string().optional().nullable().or(z.literal('')),
      }),
    )
    .optional(),
});

export type ClubFormData = z.infer<typeof clubSchema>;
