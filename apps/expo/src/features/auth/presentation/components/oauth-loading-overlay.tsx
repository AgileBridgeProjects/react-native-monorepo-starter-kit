import { AUTH_TEST_IDS } from '@features/auth/presentation/auth.copy';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, useWindowDimensions, View } from 'react-native';

import { Button, Typography } from '@/components/ui';
import { palette } from '@/constants/tokens';
import { useTranslation } from '@/src/lib/i18n';

import { AUTH_HERO_GRADIENT, AUTH_LOGO } from './auth-gradient-hero';
import { WaveDivider } from './wave-divider';

/** Seconds before showing "Taking too long?" message. */
const SLOW_THRESHOLD_S = 20;

interface OAuthLoadingOverlayProps {
  /** Whether the overlay is visible. */
  visible: boolean;
  /** Human-readable provider name (e.g. "Microsoft", "Google"). */
  provider: string;
  /** Called when the user taps "Cancel". */
  onCancel: () => void;
}

/**
 * Full-screen branded overlay shown while an OAuth flow is in progress.
 *
 * Displays the StarterKit icon, a spinner, a provider-specific message, and a
 * cancel button. After {@link SLOW_THRESHOLD_S} seconds, shows a
 * "taking too long" hint.
 */
export function OAuthLoadingOverlay({ visible, provider, onCancel }: OAuthLoadingOverlayProps) {
  const { t } = useTranslation('auth');
  const { width: screenWidth } = useWindowDimensions();
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!visible) {
      setIsSlow(false);
      return;
    }

    const timer = setTimeout(() => setIsSlow(true), SLOW_THRESHOLD_S * 1000);
    return () => clearTimeout(timer);
  }, [visible]);

  const handleCancel = useCallback(() => {
    setIsSlow(false);
    onCancel();
  }, [onCancel]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <View testID={AUTH_TEST_IDS.components.oauthOverlay.root} className="flex-1">
        <LinearGradient {...AUTH_HERO_GRADIENT} style={{ flex: 1 }}>
          {/* Logo centred in the gradient hero */}
          <View className="flex-1 items-center justify-center pb-lg">
            <Image
              source={AUTH_LOGO}
              className="w-[380px] h-[165px]"
              resizeMode="contain"
              accessibilityLabel="StarterKit"
            />
          </View>

          {/* White card with wave divider */}
          <View className="relative">
            <WaveDivider width={screenWidth} />
            <View className="bg-surface px-md pt-2xl pb-xl items-center">
              <ActivityIndicator size="large" color={palette.gradient.mid} className="mb-lg" />

              <Typography variant="body" className="mb-xs text-text-secondary text-center">
                {t('oauth.signingInWith', { provider })}
              </Typography>

              {isSlow && (
                <Typography
                  testID={AUTH_TEST_IDS.components.oauthOverlay.slowMessage}
                  variant="body-sm"
                  className="mb-sm text-text-muted text-center px-2xl"
                >
                  {t('oauth.takingLong')}
                </Typography>
              )}

              <Button
                testID={AUTH_TEST_IDS.components.oauthOverlay.cancelButton}
                variant="ghost"
                size="md"
                onPress={handleCancel}
                className="mt-lg"
              >
                {t('oauth.cancel')}
              </Button>
            </View>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}
