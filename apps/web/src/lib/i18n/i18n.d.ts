import type auditLog from '@/messages/en-ZA/audit-log.json';
import type auth from '@/messages/en-ZA/auth.json';
import type buttons from '@/messages/en-ZA/buttons.json';
import type clubs from '@/messages/en-ZA/clubs.json';
import type common from '@/messages/en-ZA/common.json';
import type errors from '@/messages/en-ZA/errors.json';
import type messageReports from '@/messages/en-ZA/message-reports.json';
import type mobileSetup from '@/messages/en-ZA/mobile-setup.json';
import type nav from '@/messages/en-ZA/nav.json';
import type roles from '@/messages/en-ZA/roles.json';
import type users from '@/messages/en-ZA/users.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      'audit-log': typeof auditLog;
      auth: typeof auth;
      buttons: typeof buttons;
      common: typeof common;
      clubs: typeof clubs;
      errors: typeof errors;
      'message-reports': typeof messageReports;
      'mobile-setup': typeof mobileSetup;
      nav: typeof nav;
      roles: typeof roles;
      users: typeof users;
    };
  }
}
