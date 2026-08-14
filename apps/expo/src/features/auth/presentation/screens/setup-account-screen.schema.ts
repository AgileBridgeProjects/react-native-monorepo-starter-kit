import { PASSWORD_COMPLEXITY, PASSWORD_MIN_LENGTH } from '@starterkit/shared';
import { z } from 'zod';

export type SetupFormValues = { password: string; confirmPassword: string };

export function createSetupSchema(t: (key: string, options?: Record<string, unknown>) => string) {
  return z
    .object({
      password: z
        .string()
        .min(1, t('validation.passwordRequired'))
        .refine((v) => PASSWORD_COMPLEXITY.test(v), {
          message: t('validation.passwordComplexity', { min: PASSWORD_MIN_LENGTH }),
        }),
      confirmPassword: z.string().min(1, t('validation.confirmPasswordRequired')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('validation.passwordMismatch'),
      path: ['confirmPassword'],
    });
}
