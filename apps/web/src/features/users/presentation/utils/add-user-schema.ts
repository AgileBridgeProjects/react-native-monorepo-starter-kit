import { JERSEY_NUMBER_MAX, NAME_REGEX } from '@starterkit/shared';
import { type CountryCode, parsePhoneNumber } from 'libphonenumber-js';
import { z } from 'zod';
import { AuthenticationMethod, PlayingPosition } from '@/proxy/models';

// Roles for which Phone Number is a mandatory contact field (the identity split AC table — Phone Number
// applies to Coach, Parent, Director, Club Admin; optional for Athlete). Enforced in both
// create and edit mode, except when the phone field itself is hidden (CustomAuthentication).
export const PHONE_REQUIRED_ROLES = ['Coach', 'Parent', 'Director', 'ClubAdmin'];

// Factory: pass isEditMode=true when editing an existing user so that the
// password field is only required when creating a CustomAuthentication user
// OR when changing an existing user's auth method TO CustomAuthentication.
export function createAddUserSchema(
  isEditMode: boolean,
  originalAuthMethod?: AuthenticationMethod,
) {
  return z
    .object({
      firstName: z
        .string({ error: 'users:addUser.validation.firstNameRequired' })
        .transform((s) => s.trim())
        .pipe(
          z
            .string()
            .min(1, 'users:addUser.validation.firstNameRequired')
            .regex(NAME_REGEX, 'users:addUser.validation.nameInvalidChars'),
        ),
      lastName: z
        .string({ error: 'users:addUser.validation.lastNameRequired' })
        .transform((s) => s.trim())
        .pipe(
          z
            .string()
            .min(1, 'users:addUser.validation.lastNameRequired')
            .regex(NAME_REGEX, 'users:addUser.validation.nameInvalidChars'),
        ),
      roleName: z
        .string({ error: 'users:addUser.validation.roleRequired' })
        .min(1, 'users:addUser.validation.roleRequired'),
      // Single-team field for roles that don't use the many-to-many Team Assignment section
      // below (Athlete/Coach use `teamIds` instead; the identity split). Not required by any role.
      // Submitted as a one-element `teamIds` list — UserTeams is the sole source of truth
      // for team membership.
      teamId: z.string().optional(),
      authMethod: z.union([
        z.literal(AuthenticationMethod.Credentials),
        z.literal(AuthenticationMethod.PhoneOtp),
        z.literal(AuthenticationMethod.Microsoft365),
        z.literal(AuthenticationMethod.Google),
        z.literal(AuthenticationMethod.CustomAuthentication),
      ]),
      // Accepts either a valid email address or a plain username (no @).
      // Format validation is done in superRefine based on the auth method.
      email: z.string(),
      // ISO 3166-1 alpha-2 country code used to validate and normalise the phone number.
      countryCode: z.string(),
      phoneNumber: z.string().transform((val) => val.replace(/[\s\-()]/g, '')),
      username: z.string().optional(),
      password: z.string().optional(),
      // Athlete-specific fields
      dateOfBirth: z.string().optional(),
      position: z.nativeEnum(PlayingPosition).optional(),
      // Kept as a string at the form-input boundary (matches the DevExtreme TextBox value type);
      // validated/coerced to a JERSEY_NUMBER_MIN-MAX integer here, then converted to a number on
      // submit.
      jerseyNumber: z
        .string()
        .regex(/^\d+$/, 'users:addUser.validation.jerseyNumberInvalid')
        .refine(
          (value) => Number(value) <= JERSEY_NUMBER_MAX,
          'users:addUser.validation.jerseyNumberInvalid',
        )
        .optional()
        .or(z.literal('')),
      // Many-to-many Team Assignment (Athlete, Coach) — additive to the single `teamId` above.
      teamIds: z.array(z.string()).optional(),
      // Linked Athlete(s) for a Parent user.
      dependentUserIds: z.array(z.string()).optional(),
      // Parent/Guardian email for a new Athlete — resolved server-side to an existing Parent user.
      parentGuardianEmail: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.authMethod === AuthenticationMethod.Credentials) {
        if (!data.email) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['email'],
            message: 'users:addUser.validation.emailRequired',
          });
        } else if (!z.string().email().safeParse(data.email).success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['email'],
            message: 'users:addUser.validation.emailInvalid',
          });
        }
      }

      // Phone is a plain contact field, unrelated to sign-in for every auth method —
      // required for Coach/Parent/Director/ClubAdmin, optional otherwise — but must be a valid
      // number for the selected country whenever provided. Hidden only for CustomAuthentication
      // (username/password instead), so this only fires when the field is visible.
      if (data.phoneNumber) {
        try {
          const parsed = parsePhoneNumber(data.phoneNumber, data.countryCode as CountryCode);
          if (!parsed.isValid()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['phoneNumber'],
              message: 'users:addUser.validation.phoneInvalid',
            });
          }
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['phoneNumber'],
            message: 'users:addUser.validation.phoneInvalid',
          });
        }
      } else if (
        data.authMethod !== AuthenticationMethod.CustomAuthentication &&
        PHONE_REQUIRED_ROLES.includes(data.roleName)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['phoneNumber'],
          message: 'users:addUser.validation.phoneRequired',
        });
      }

      if (
        data.authMethod === AuthenticationMethod.Google ||
        data.authMethod === AuthenticationMethod.Microsoft365
      ) {
        if (!data.email) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['email'],
            message: 'users:addUser.validation.emailRequiredForSso',
          });
        } else if (!z.string().email().safeParse(data.email).success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['email'],
            message: 'users:addUser.validation.emailInvalid',
          });
        }
      }

      if (
        data.roleName === 'Athlete' &&
        data.parentGuardianEmail &&
        !z.string().email().safeParse(data.parentGuardianEmail).success
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['parentGuardianEmail'],
          message: 'users:addUser.validation.parentGuardianEmailInvalid',
        });
      }

      // the identity split: a Parent's mobile onboarding ends on a "set your relationship to each linked
      // athlete" step, so creating one with no links leaves them stuck on an empty screen.
      // Bulk CSV upload is exempt — there the links come from the athlete rows, not this form.
      if (data.roleName === 'Parent' && !data.dependentUserIds?.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dependentUserIds'],
          message: 'users:addUser.validation.linkedAthletesRequired',
        });
      }

      // the identity split: a Coach's mobile onboarding ends on a "linked teams" step, so creating one with
      // no team assignment leaves them stuck on an empty screen. Bulk CSV upload is exempt, same
      // reasoning as the Parent rule above.
      if (data.roleName === 'Coach' && !data.teamIds?.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['teamIds'],
          message: 'users:addUser.validation.teamAssignmentRequired',
        });
      }

      if (data.roleName === 'Athlete') {
        if (!data.dateOfBirth) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['dateOfBirth'],
            message: 'users:addUser.validation.dateOfBirthRequired',
          });
        } else {
          const parsed = new Date(data.dateOfBirth);
          if (Number.isNaN(parsed.getTime())) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['dateOfBirth'],
              message: 'users:addUser.validation.dateOfBirthInvalid',
            });
          } else if (parsed.getTime() > Date.now()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['dateOfBirth'],
              message: 'users:addUser.validation.dateOfBirthFuture',
            });
          }
        }
      }

      if (data.authMethod === AuthenticationMethod.CustomAuthentication) {
        const trimmedUsername = data.username?.trim();
        if (!trimmedUsername) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['username'],
            message: 'users:addUser.validation.usernameRequired',
          });
        } else if (!/^[a-zA-Z0-9._-]+$/.test(trimmedUsername)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['username'],
            message: 'users:addUser.validation.usernameInvalidChars',
          });
        }
        // Password is required when creating a CustomAuthentication user OR when
        // switching an existing user's auth method to CustomAuthentication.
        const isChangingToCustomAuth =
          isEditMode && originalAuthMethod !== AuthenticationMethod.CustomAuthentication;
        if ((!isEditMode || isChangingToCustomAuth) && !data.password?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['password'],
            message: 'users:addUser.validation.passwordRequired',
          });
        }
      }
    })
    .transform((data) => {
      if (!data.phoneNumber) return data;
      try {
        const parsed = parsePhoneNumber(data.phoneNumber, data.countryCode as CountryCode);
        return { ...data, phoneNumber: parsed.number };
      } catch {
        return data;
      }
    });
}

export type AddUserFormData = z.infer<ReturnType<typeof createAddUserSchema>>;
