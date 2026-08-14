import { DEFAULT_LOCALE } from '@starterkit/shared';
import i18n from 'i18next';

// Mobile date display: "05 Sep 2026" — short month keeps dates human-readable on
// compact screens. DD/MM/YYYY (adminDateOptions) is reserved for the web admin portal.
const mobileDateOptions: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
};

function getLocale(locale?: string) {
  return locale ?? i18n.language ?? DEFAULT_LOCALE;
}

export function formatDateTime(
  value: Date | number | string,
  locale?: string,
  options: Intl.DateTimeFormatOptions = mobileDateOptions,
) {
  return new Intl.DateTimeFormat(getLocale(locale), options).format(new Date(value));
}

export function formatAdminDate(value: Date | number | string, locale?: string) {
  return formatDateTime(value, locale);
}

export function formatNumber(value: number, locale?: string, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(getLocale(locale), options).format(value);
}

export function formatCurrency(
  value: number,
  currency: string,
  locale?: string,
  options?: Intl.NumberFormatOptions,
) {
  return formatNumber(value, locale, {
    style: 'currency',
    currency,
    ...options,
  });
}
