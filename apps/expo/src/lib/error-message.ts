import { i18n } from '@lib/i18n';

/**
 * Extracts a user-facing, localized message from any error type.
 *
 * - Domain failures (name ends with `Failure` + has `localeKey`): resolved via
 *   the `errors` i18n namespace with optional interpolation params.
 * - Other errors: returns the generic fallback from the `errors` namespace.
 * - Nullish input: returns `null` (no error to display).
 */
export function getErrorMessage(error: unknown): string | null {
  if (!error) return null;

  // i18n.t is strictly typed to known locale key unions; cast once to allow
  // dynamic key + ns-option calls at runtime.
  const t = i18n.t as (key: string, opts?: Record<string, unknown>) => string;

  if (
    error instanceof Error &&
    error.name.endsWith('Failure') &&
    'localeKey' in error &&
    typeof (error as { localeKey: unknown }).localeKey === 'string'
  ) {
    const { localeKey, localeParams } = error as {
      localeKey: string;
      localeParams?: Record<string, string>;
    };
    return t(localeKey, { ns: 'errors', ...localeParams });
  }

  return t('auth.unknown', { ns: 'errors' });
}
