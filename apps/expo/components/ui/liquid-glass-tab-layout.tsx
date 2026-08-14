import { useTranslation } from '@lib/i18n';
import { usePathname, useRouter } from 'expo-router';
import { NativeTabs, type NativeTabsTriggerIconProps } from 'expo-router/unstable-native-tabs';
import { useEffect } from 'react';
import { NAV_ITEMS } from '@/constants/navigation-items';
import { colors, palette } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useIsOnline } from '@/src/lib/hooks/use-is-online';

// Per-tab icons. SF Symbols get the hollow/filled pair treatment on iOS; Material
// glyphs rarely have a filled variant, so Android repeats the same name.
const SF_ICONS: Record<string, { default: string; selected: string }> = {
  '/': { default: 'house', selected: 'house.fill' },
};

const MD_ICONS: Record<string, { default: string; selected: string }> = {
  '/': { default: 'home', selected: 'home' },
};

// Maps each nav href to the route-group directory name under app/(tabs)/.
const TRIGGER_NAMES: Record<string, string> = {
  '/': '(home)',
};

export function LiquidGlassTabLayout() {
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;
  const { t } = useTranslation();
  const isOnline = useIsOnline();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect to an offline-enabled tab when on a disabled tab, so the user is
  // never stranded on a screen that cannot render without a connection.
  const offlineFallback = NAV_ITEMS.find((i) => i.offlineEnabled)?.href ?? '/';
  const currentNavItem =
    NAV_ITEMS.find((i) => i.href === pathname || (i.href !== '/' && pathname.startsWith(i.href))) ??
    (pathname === '/' ? NAV_ITEMS.find((i) => i.href === '/') : undefined);
  useEffect(() => {
    if (!isOnline && currentNavItem && !currentNavItem.offlineEnabled) {
      router.replace(offlineFallback);
    }
  }, [isOnline, currentNavItem, offlineFallback, router]);

  const disabledColor = `${colors[colorScheme].iconInactive}66`; // ~40% opacity
  const disabledAppearance = {
    ios: {
      standardAppearance: {
        stacked: {
          disabled: {
            tabBarItemIconColor: disabledColor,
            tabBarItemTitleFontColor: disabledColor,
          },
        },
        inline: {
          disabled: {
            tabBarItemIconColor: disabledColor,
            tabBarItemTitleFontColor: disabledColor,
          },
        },
        compactInline: {
          disabled: {
            tabBarItemIconColor: disabledColor,
            tabBarItemTitleFontColor: disabledColor,
          },
        },
      },
    },
  };

  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      disableTransparentOnScrollEdge
      tintColor={colors[colorScheme].iconActive}
      backgroundColor={colors[colorScheme].tabBar}
      // Badge colours stay on brand rather than the platform-default system red.
      badgeBackgroundColor={palette.cyan.DEFAULT}
      badgeTextColor={palette.blue.screen}
      labelVisibilityMode="labeled"
      iconColor={{
        default: colors[colorScheme].iconInactive,
        selected: colors[colorScheme].iconActive,
      }}
      labelStyle={{
        default: { color: colors[colorScheme].iconInactive },
        selected: { color: colors[colorScheme].iconActive },
      }}
    >
      {NAV_ITEMS.map((item) => {
        const triggerName = TRIGGER_NAMES[item.href];
        const sfIcon = SF_ICONS[item.href];
        const mdIcon = MD_ICONS[item.href];
        const isDisabledOffline = !isOnline && !item.offlineEnabled;

        return (
          <NativeTabs.Trigger
            key={item.href}
            name={triggerName}
            disabled={isDisabledOffline}
            unstable_nativeProps={disabledAppearance}
          >
            <NativeTabs.Trigger.Icon
              {...({ sf: sfIcon, md: mdIcon } as NativeTabsTriggerIconProps)}
            />
            <NativeTabs.Trigger.Label>{t(item.labelKey)}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        );
      })}
    </NativeTabs>
  );
}
