'use client';

import { createInstance } from 'i18next';
import { useState } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';

import type { Messages } from './load-messages';

interface I18nProviderProps {
  children: React.ReactNode;
  locale: string;
  messages: Messages;
}

export function I18nProvider({ children, locale, messages }: I18nProviderProps) {
  const [i18n] = useState(() => {
    const instance = createInstance();

    instance.use(initReactI18next).init({
      lng: locale,
      fallbackLng: locale,
      resources: {
        [locale]: messages,
      },
      defaultNS: 'common',
      ns: Object.keys(messages),
      interpolation: {
        escapeValue: false,
      },
      returnNull: false,
    });

    return instance;
  });

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
