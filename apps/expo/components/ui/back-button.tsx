import { useTranslation } from '@lib/i18n';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { colors, iconSize } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/src/lib/cn';

import { Icon } from './icon';
import { Typography } from './typography';

export interface BackButtonProps {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  className?: string;
  /** Pass a label to show text next to the chevron. Omit for icon-only (industry standard). */
  label?: string;
  onPress?: () => void;
  testID?: string;
  /** Override icon/label color (hex). Defaults to theme primary. */
  tintColor?: string;
}

export function BackButton({
  accessibilityHint,
  accessibilityLabel,
  className,
  label,
  onPress,
  testID,
  tintColor,
}: BackButtonProps) {
  const router = useRouter();
  const { t } = useTranslation('buttons');
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;

  const resolvedLabel = label ?? t('back');
  const resolvedColor = tintColor ?? colors[colorScheme].primary;

  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel ?? resolvedLabel}
      onPress={onPress ?? (() => router.back())}
      testID={testID}
      className={cn(
        'touch-target -ml-xs self-center flex-row items-center justify-center gap-xs',
        className,
      )}
    >
      <Icon name="chevron.left" size={iconSize.xs} color={resolvedColor} />
      {label !== undefined && (
        <Typography
          variant="body-sm"
          className={cn(!tintColor && 'text-primary')}
          style={tintColor ? { color: tintColor } : undefined}
        >
          {resolvedLabel}
        </Typography>
      )}
    </Pressable>
  );
}
