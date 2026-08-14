import { HomeIcon } from '@starterkit/icons';

/**
 * Central navigation configuration used by both native (bottom tabs) and web (sidebar/hamburger).
 *
 * The starter kit ships a single Home tab. Add an entry per tab group you create under
 * `apps/expo/app/(tabs)/` — the tab bar (`liquid-glass-tab-layout.tsx`) renders one trigger
 * per item here.
 *
 * Each item includes:
 * - `href`: Route path matching the file structure in apps/expo/app/(tabs)/
 * - `labelKey`: i18n translation key for the tab/link label
 * - `WebIcon`: React component icon used by web sidebar/hamburger (tree-shaken on native builds)
 */

export interface NavItem {
  href: '/';
  labelKey: string;
  // biome-ignore lint/suspicious/noExplicitAny: icon components share a common shape
  WebIcon: React.ComponentType<any>;
  /** Whether this tab remains interactive when the device is offline. */
  offlineEnabled?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    labelKey: 'titles:nav.home',
    WebIcon: HomeIcon,
    // Home renders from cached/local data, making it the offline fallback tab.
    offlineEnabled: true,
  },
];
