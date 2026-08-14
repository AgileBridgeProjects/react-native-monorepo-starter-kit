import { useTranslation } from '@lib/i18n';
import { useEffect } from 'react';
import { BackHandler, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, Typography } from '@/components/ui';
import { colors, iconSize } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOtaUpdates } from '@/hooks/use-ota-updates';

/**
 * Global OTA update prompt — mounted once in the root layout.
 *
 * Shows a full-screen, non-dismissible message when {@link useOtaUpdates} has
 * downloaded a new update — the user must restart to continue. There is no
 * "not now" option: the Android hardware back button is blocked too, since
 * this isn't a sheet the user can swipe or tap away.
 */
export function UpdateBanner() {
  const { t } = useTranslation('updates');
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;
  const insets = useSafeAreaInsets();
  const { isRestartReady, restart } = useOtaUpdates();

  useEffect(() => {
    if (!isRestartReady || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [isRestartReady]);

  if (!isRestartReady) return null;

  return (
    <View
      className="absolute inset-0 items-center justify-center bg-background px-xl"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="w-full items-center gap-lg">
        <Icon
          name="arrow.down.circle.fill"
          size={iconSize.lg}
          color={colors[colorScheme].primary}
        />
        <View className="items-center gap-sm">
          <Typography variant="h2" className="text-center">
            {t('updateReady')}
          </Typography>
          <Typography variant="body" className="text-center text-text-secondary">
            {t('updateReadyDescription')}
          </Typography>
        </View>
        <Button variant="primary" size="lg" fullWidth onPress={restart}>
          {t('restart')}
        </Button>
      </View>
    </View>
  );
}
