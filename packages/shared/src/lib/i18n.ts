/**
 * Shared i18n constants for both apps/expo and apps/web.
 *
 * DEFAULT_LOCALE is en-ZA because the primary market is South Africa
 * (currency: ZAR). Admin-facing dates must always render in the explicit
 * South African numeric format DD/MM/YYYY across both apps.
 */

export const DEFAULT_LOCALE = 'en-ZA';
export const ADMIN_DATE_PICKER_FORMAT = 'dd/MM/yyyy';

export const adminDateOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
} satisfies Intl.DateTimeFormatOptions;

/**
 * Time-of-day format (e.g. "14:32") used alongside admin dates in grids and
 * detail views where both the day and the time are relevant.
 */
export const adminTimeOptions = {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
} satisfies Intl.DateTimeFormatOptions;

/**
 * Compact "d MMM yy" date — used for badges and chips where space is tight
 * (e.g. the "shared since" badge on the topics share dialog).
 */
export const compactDateOptions = {
  day: 'numeric',
  month: 'short',
  year: '2-digit',
} satisfies Intl.DateTimeFormatOptions;

export function formatSouthAfricanDate(
  value: Date | number | string,
  locale: string = DEFAULT_LOCALE,
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat(locale, adminDateOptions).formatToParts(date);
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const year = parts.find((part) => part.type === 'year')?.value ?? '';

  if (!day || !month || !year) return '';
  return `${day}/${month}/${year}`;
}

export function formatCompactDate(
  value: Date | number | string,
  locale: string = DEFAULT_LOCALE,
): string {
  return new Intl.DateTimeFormat(locale, compactDateOptions).format(new Date(value));
}
