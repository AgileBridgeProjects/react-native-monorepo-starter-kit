import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next, useTranslation as useTranslationBase } from 'react-i18next';

import auth from './locales/en-ZA/auth.json';
import buttons from './locales/en-ZA/buttons.json';
import common from './locales/en-ZA/common.json';
import errors from './locales/en-ZA/errors.json';
import home from './locales/en-ZA/home.json';
import labels from './locales/en-ZA/labels.json';
import profile from './locales/en-ZA/profile.json';
import titles from './locales/en-ZA/titles.json';
import updates from './locales/en-ZA/updates.json';

const DEFAULT_LOCALE = 'en-ZA';
const SUPPORTED_LOCALES = ['en-ZA'] as const;

type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function getDeviceLocale(): SupportedLocale {
  const tag = (Localization.getLocales()[0]?.languageTag ?? DEFAULT_LOCALE).replace('_', '-');
  return (SUPPORTED_LOCALES as readonly string[]).includes(tag)
    ? (tag as SupportedLocale)
    : DEFAULT_LOCALE;
}

i18n.use(initReactI18next).init({
  resources: {
    'en-ZA': {
      auth,
      buttons,
      common,
      errors,
      home,
      labels,
      profile,
      titles,
      updates,
    },
  },
  lng: getDeviceLocale(),
  fallbackLng: DEFAULT_LOCALE,
  ns: ['auth', 'buttons', 'common', 'errors', 'home', 'labels', 'profile', 'titles', 'updates'],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

export { i18n };
// Re-export with a type-cast wrapper so callers can pass namespace-prefixed string keys
// (e.g. t('titles:nav.home')) without TypeScript errors at every call site.
export function useTranslation(ns?: string | string[]) {
  const { t: tBase, ...rest } = useTranslationBase(ns as never);
  const t = (key: string, options?: Record<string, unknown>) =>
    tBase(key as never, options as never) as unknown as string;
  return { t, ...rest };
}
export { formatAdminDate, formatCurrency, formatDateTime, formatNumber } from './formatters';
