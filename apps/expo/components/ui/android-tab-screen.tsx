import { useProfile } from '@features/profile/presentation/hooks/use-profile';
import { useTranslation } from '@lib/i18n';
import { useAuthStore } from '@store/auth-store';
import { Slot, Stack } from 'expo-router';
import { Platform } from 'react-native';
import { TabHeader } from '@/components/ui/tab-header';
import { colors } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';

const HEADER_HEIGHT = 76;

const baseHeaderStyle = {
  borderBottomWidth: 0,
  shadowOpacity: 0,
  elevation: 0,
  height: HEADER_HEIGHT,
} as const;

interface AndroidTabScreenProps {
  title: string;
  variant?: 'primary' | 'surface';
}

/**
 * Wraps a tab's content with a platform-appropriate layout.
 *
 * Android: Stack navigator with a custom TabHeader (AppBar above content).
 * iOS:     Slot — NativeTabs' UINavigationController owns the top bar natively.
 */
export function AndroidTabScreen({ title, variant = 'surface' }: AndroidTabScreenProps) {
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;

  // 'surface' floats transparently over the gradient body instead of a flat
  // color, matching AndroidHomeTabScreen below — the tab content now renders
  // on the gradient everywhere, not just Home.
  const bgColor = variant === 'surface' ? 'transparent' : colors[colorScheme].primary;

  return Platform.OS !== 'android' ? (
    <Slot />
  ) : (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: variant === 'surface',
        headerShadowVisible: false,
        headerStyle: { ...baseHeaderStyle, backgroundColor: bgColor },
        headerTitleAlign: 'left',
        headerTintColor: colors[colorScheme].primaryForeground,
        headerTitle: () => <TabHeader title={title} colorScheme={colorScheme} variant={variant} />,
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}

/**
 * Home-tab variant — resolves the personalised greeting and club logo,
 * which the standard AndroidTabScreen doesn't need.
 */
export function AndroidHomeTabScreen() {
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;
  const { t } = useTranslation();
  const { data: profile } = useProfile();
  const authUserName = useAuthStore((s) => s.user?.name);
  const userName = profile?.displayName ?? authUserName;
  const firstName = userName?.split(' ')[0];
  const greetingTitle = firstName
    ? t('home:greetingName', { name: firstName })
    : t('home:greeting');

  return Platform.OS !== 'android' ? (
    <Slot />
  ) : (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerShadowVisible: false,
        headerStyle: { ...baseHeaderStyle, backgroundColor: 'transparent' },
        headerTitleAlign: 'left',
        headerTintColor: colors[colorScheme].primaryForeground,
        headerTitle: () => (
          <TabHeader title={greetingTitle} colorScheme={colorScheme} variant="primary" />
        ),
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
