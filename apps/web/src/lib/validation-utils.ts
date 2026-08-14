import { z } from 'zod';

/**
 * Returns `true` when `value` is a syntactically valid email address.
 * Uses Zod's built-in email validator so the check is consistent with
 * form schemas that use `z.string().email()`.
 */
export function isEmail(value: string): boolean {
  return z.string().email().safeParse(value).success;
}
