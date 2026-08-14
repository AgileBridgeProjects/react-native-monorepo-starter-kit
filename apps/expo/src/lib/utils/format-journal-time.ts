import { DEFAULT_LOCALE } from '@starterkit/shared';

/**
 * Month-header grouping for the Journal history list (History AC 3): entries are
 * grouped under month headers ("MAY", "APRIL"), most recent month first.
 *
 * `isDifferentMonth` — the generic month-boundary check — lives in the neutrally-named
 * `format-date.ts` instead, since the Calendar list now groups by month the same way.
 */

/** "MAY" / "APRIL" — the month-header label for a given entry timestamp. */
export function formatMonthLabel(value: Date | number | string): string {
  const date = value instanceof Date ? value : new Date(value as string | number);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, { month: 'long' }).format(date).toUpperCase();
}
