import { cookies, headers } from 'next/headers';
import { getAvailableLocales } from './load-messages';
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME } from './settings';

function normaliseLocale(value: string) {
  return value.replaceAll('_', '-').trim();
}

function getLocaleCandidates(headerValue: string | null) {
  if (!headerValue) {
    return [];
  }

  return headerValue
    .split(',')
    .map((part) => normaliseLocale(part.split(';')[0] ?? ''))
    .filter(Boolean);
}

export async function getRequestLocale() {
  const availableLocales = await getAvailableLocales();
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  if (cookieLocale) {
    const normalisedCookieLocale = normaliseLocale(cookieLocale);
    if (availableLocales.includes(normalisedCookieLocale)) {
      return normalisedCookieLocale;
    }
  }

  const headerStore = await headers();
  const acceptLanguage = headerStore.get('accept-language');

  for (const candidate of getLocaleCandidates(acceptLanguage)) {
    if (availableLocales.includes(candidate)) {
      return candidate;
    }

    const languageOnlyMatch = availableLocales.find((locale) =>
      locale.toLowerCase().startsWith(`${candidate.toLowerCase()}-`),
    );

    if (languageOnlyMatch) {
      return languageOnlyMatch;
    }
  }

  return DEFAULT_LOCALE;
}
