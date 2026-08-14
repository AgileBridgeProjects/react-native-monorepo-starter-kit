import type { TOptions } from 'i18next';

interface LocalizedFailure extends Error {
  translationValues?: TOptions;
}

export function getErrorMessage(
  error: unknown,
  t: (key: string, options?: TOptions) => string,
  fallback?: string,
): string | null {
  if (!error) return null;

  if (error instanceof Error && error.name.endsWith('Failure')) {
    const localizedFailure = error as LocalizedFailure;
    return t(error.message, localizedFailure.translationValues);
  }

  return fallback ?? t('errors:genericError');
}
