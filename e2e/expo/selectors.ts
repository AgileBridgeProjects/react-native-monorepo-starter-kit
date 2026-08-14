/**
 * Expo E2E test-ID selectors.
 *
 * SINGLE SOURCE OF TRUTH: these re-export the real `*_TEST_IDS` registries from each
 * feature's `*.copy.ts` in `apps/expo/src`. Do NOT hand-copy ids here — that caused
 * persistent drift (stale/phantom selectors). When a feature adds a testID to its
 * `.copy.ts`, it is automatically available to E2E. The `.copy.ts` files are pure
 * constant objects (no React Native imports), so they bundle cleanly under Playwright.
 */
import { AUTH_TEST_IDS } from '../../apps/expo/src/features/auth/presentation/auth.copy';

export { AUTH_TEST_IDS } from '../../apps/expo/src/features/auth/presentation/auth.copy';
export { DISC_TEST_IDS } from '../../apps/expo/src/features/disc/presentation/disc.copy';
export { JOURNAL_ALERTS_TEST_IDS } from '../../apps/expo/src/features/journal-alerts/presentation/journal-alerts.copy';
export { NOTIFICATIONS_TEST_IDS } from '../../apps/expo/src/features/notifications/notifications.copy';
export {
  EDIT_PROFILE_TEST_IDS,
  HELP_TEST_IDS,
  PROFILE_TEST_IDS,
  SETTINGS_TEST_IDS,
} from '../../apps/expo/src/features/profile/presentation/profile.copy';

/**
 * Back-compat alias for the select-organisation / drawer flow, composed from the real
 * AUTH registry so the existing org-switch POM/specs keep working.
 */
export const ORG_SWITCH_TEST_IDS = {
  screen: AUTH_TEST_IDS.selectOrg.screen,
  orgItem: AUTH_TEST_IDS.selectOrg.orgItem,
  drawerSwitchOrg: AUTH_TEST_IDS.drawer.switchOrg,
} as const;
