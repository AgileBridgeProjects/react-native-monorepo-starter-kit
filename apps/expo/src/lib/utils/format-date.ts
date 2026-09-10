import { DEFAULT_LOCALE } from '@starterkit/shared';

/**
 * Formats a date as "d Mon 'yy" — e.g. "12 Sep '26".
 *
 * Uses Intl.DateTimeFormat.formatToParts so the apostrophe can be injected
 * before the 2-digit year without string-manipulation fragility.
 */
export function formatMobileDate(value: Date | number | string): string {
  const date = value instanceof Date ? value : new Date(value as string | number);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  }).formatToParts(date);
  return parts
    .map((part) => (part.type === 'year' ? `'${part.value}` : part.value))
    .join('')
    .trim();
}

/**
 * Formats a date with the month spelled out — e.g. "12 September 2026". Used where a
 * short numeric date (07/08) would be ambiguous about day/month order.
 */
export function formatLongDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
