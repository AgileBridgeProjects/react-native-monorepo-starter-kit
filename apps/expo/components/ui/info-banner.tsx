import { View } from 'react-native';
import { colors, iconSize } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/src/lib/cn';
import type { IconProps } from './icon';
import { Icon } from './icon';
import { Typography } from './typography';

// ─── Props ───────────────────────────────────────────────────────────────────

interface InfoBannerProps {
  /** Banner message text. */
  message: string;
  /** SF Symbol icon name (mapped via icon-symbol on web/Android). */
  icon?: IconProps['name'];
  /** Optional test ID for the banner container. */
  testID?: string;
  /** Additional container className overrides. */
  className?: string;
  /**
   * Visual variant.
   * - `primary` (default) — tinted with the brand primary colour.
   * - `muted` — neutral grey, used for informational / offline states.
   */
  variant?: 'primary' | 'muted';
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Full-width informational banner strip.
 * Place outside scrollable content to keep it sticky.
 */
export function InfoBanner({
  message,
  icon = 'clock.fill',
  testID,
  className,
  variant = 'primary',
}: InfoBannerProps) {
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;
  const isMuted = variant === 'muted';

  return (
    <View
      testID={testID}
      className={cn(
        'flex-row items-center justify-center gap-sm px-lg py-sm min-h-9',
        isMuted ? 'bg-surface' : 'bg-primary/10',
        className,
      )}
    >
      <Icon
        name={icon}
        size={iconSize.xs}
        color={isMuted ? colors[colorScheme].textMuted : colors[colorScheme].primary}
      />
      <Typography
        variant="caption"
        className={cn('font-medium', isMuted ? 'text-text-muted' : 'text-primary')}
      >
        {message}
      </Typography>
    </View>
  );
}

export type { InfoBannerProps };
