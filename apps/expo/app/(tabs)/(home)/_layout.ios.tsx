import { useProfile } from '@features/profile/presentation/hooks/use-profile';
import { useTranslation } from '@lib/i18n';
import { fontSize, fontWeight } from '@starterkit/shared';
import { useAuthStore } from '@store/auth-store';
import { Stack } from 'expo-router';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { TabHeader } from '@/components/ui/tab-header';
import { colors } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function HomeLayout() {
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;
  const rnColorScheme = (useRNColorScheme() ?? 'light') as keyof typeof colors;
  const { t } = useTranslation('home');
  const { data: profile } = useProfile();
  const authUserName = useAuthStore((s) => s.user?.name);
  const userName = profile?.displayName ?? authUserName;
  const firstName = userName?.split(' ')[0];
  const greetingTitle = firstName ? t('greetingName', { name: firstName }) : t('greeting');

  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: 'transparent',
        },
        headerTitleStyle: {
          color: colors[colorScheme].primaryForeground,
          fontSize: fontSize.xl,
          fontWeight: fontWeight.bold,
        },
        headerTintColor: colors[colorScheme].primaryForeground,
        headerTitle: () => (
          <TabHeader title={greetingTitle} colorScheme={rnColorScheme} variant="primary" />
        ),
      }}
    />
  );
}
