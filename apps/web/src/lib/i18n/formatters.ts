import { adminDateOptions, adminTimeOptions, formatSouthAfricanDate } from '@starterkit/shared';

import { DEFAULT_LOCALE } from './settings';

export function formatDateTime(
  value: Date | number | string,
  locale = DEFAULT_LOCALE,
  options: Intl.DateTimeFormatOptions = adminDateOptions,
) {
  if (options === adminDateOptions) {
    return formatSouthAfricanDate(value, locale);
  }
  return new Intl.DateTimeFormat(locale, options).format(new Date(value));
}

export function formatAdminDate(value: Date | number | string, locale = DEFAULT_LOCALE) {
  return formatSouthAfricanDate(value, locale);
}

export function formatAdminTime(value: Date | number | string, locale = DEFAULT_LOCALE) {
  return formatDateTime(value, locale, adminTimeOptions);
}

export function formatNumber(
  value: number,
  locale = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatCurrency(
  value: number,
  currency: string,
  locale = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions,
) {
  return formatNumber(value, locale, {
    style: 'currency',
    currency,
    ...options,
  });
}

/**
 * Re-export `formatCompactDate` from `@starterkit/shared` so existing callers via
 * `@lib/i18n` don't break, while the canonical implementation lives once in the
 * shared package and is reusable by mobile.
 */
export { formatCompactDate } from '@starterkit/shared';
