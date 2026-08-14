import type auth from './locales/en-ZA/auth.json';
import type buttons from './locales/en-ZA/buttons.json';
import type common from './locales/en-ZA/common.json';
import type errors from './locales/en-ZA/errors.json';
import type home from './locales/en-ZA/home.json';
import type labels from './locales/en-ZA/labels.json';
import type profile from './locales/en-ZA/profile.json';
import type titles from './locales/en-ZA/titles.json';
import type updates from './locales/en-ZA/updates.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      auth: typeof auth;
      buttons: typeof buttons;
      common: typeof common;
      errors: typeof errors;
      home: typeof home;
      labels: typeof labels;
      profile: typeof profile;
      titles: typeof titles;
      updates: typeof updates;
    };
  }
}
