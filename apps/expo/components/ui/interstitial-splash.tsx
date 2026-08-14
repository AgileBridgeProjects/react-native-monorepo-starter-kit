import { CloseIcon } from '@starterkit/icons';
import { Image, type ImageSourcePropType, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/constants/tokens';
import { Button } from './button';
import { Typography } from './typography';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface InterstitialSplashProps {
  /** Static image displayed prominently. Takes precedence over `emoji` when both are provided. */
  image?: ImageSourcePropType;
  /** Fallback large emoji when no image is provided. */
  emoji?: string;
  /** Headline text below the visual. */
  heading: string;
  /** Optional subtitle below the heading. */
  subtitle?: string;
  /** Label for the primary CTA button. */
  buttonLabel: string;
  /** Called when the CTA button is pressed. */
  onPress: () => void;
  /** testID for the root container. */
  testID?: string;
  /** testID for the CTA button. */
  buttonTestID?: string;
  /** Called when the close / back button is pressed. If omitted, no close button is shown. */
  onClose?: () => void;
  /** When true the CTA button is hidden (e.g. no questions available). */
  hideButton?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Full-screen interstitial splash — centred image or emoji, heading, subtitle and CTA.
 * Used between flow transitions (e.g. game complete → view results).
 */
export function InterstitialSplash({
  image,
  emoji,
  heading,
  subtitle,
  buttonLabel,
  onPress,
  testID,
  buttonTestID,
  onClose,
  hideButton,
}: InterstitialSplashProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-background px-lg"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }}
      testID={testID}
    >
      {onClose && (
        <View className="items-start pt-sm">
          <Pressable
            onPress={onClose}
            accessibilityLabel="Close"
            accessibilityRole="button"
            className="rounded-full p-xs"
          >
            <CloseIcon size={24} className="text-text-secondary" />
          </Pressable>
        </View>
      )}

      <View className="flex-1 items-center justify-center">
        <View className="items-center gap-md">
          {image ? (
            <Image
              source={image}
              className="h-48 w-48"
              resizeMode="contain"
              accessibilityElementsHidden
            />
          ) : emoji ? (
            <Text className="text-center text-8xl" accessibilityElementsHidden>
              {emoji}
            </Text>
          ) : null}
          <Typography variant="h1" className="text-center font-black text-text">
            {heading}
          </Typography>
          {subtitle && (
            <Typography variant="body" className="text-center text-text-secondary">
              {subtitle}
            </Typography>
          )}
        </View>
      </View>

      {!hideButton && (
        <View className="w-full items-center">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={onPress}
            accessibilityLabel={buttonLabel}
            testID={buttonTestID}
          >
            {buttonLabel}
          </Button>
        </View>
      )}
    </View>
  );
}
