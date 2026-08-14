import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import type { IconSymbolName } from '@/components/ui/icon-symbol';
import { colors, iconSize } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/src/lib/cn';

interface SocialSignInButtonProps {
  icon: IconSymbolName;
  /** Optional branded SVG/element to render instead of the FontAwesome icon. */
  brandIcon?: React.ReactNode;
  /** Label text — shown in both modes. */
  label?: string;
  accessibilityLabel: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** When true renders full-width (single column). Default renders as flex-1 pill (use in a flex-row parent). */
  fullWidth?: boolean;
  testID?: string;
}

/**
 * A generic social / alternative sign-in button.
 * - Default: equal-width pill with icon + label, styled like form inputs
 *   (bg-neutral-100, rounded-xl, no border). Use in a flex-row parent.
 * - fullWidth: full-width row variant for single-column layouts.
 */
export function SocialSignInButton({
  icon,
  brandIcon,
  label,
  accessibilityLabel,
  onPress,
  loading = false,
  disabled = false,
  fullWidth = false,
  testID,
}: SocialSignInButtonProps) {
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;
  const isDisabled = disabled || loading;
  const iconColor = Platform.OS === 'web' ? 'var(--color-text)' : colors[colorScheme].text;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={cn(
        'h-11 flex-row items-center justify-center gap-2 rounded-[15px] border border-border-strong bg-surface-elevated active:opacity-70 disabled:opacity-50',
        fullWidth ? 'w-full' : 'flex-1',
      )}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <>
          <View className="w-5 items-center justify-center">
            {brandIcon ?? <Icon name={icon} size={iconSize.sm} color={iconColor} />}
          </View>
          {label ? (
            <Text className="font-body-semibold text-xs text-text-secondary">{label}</Text>
          ) : null}
        </>
      )}
    </Pressable>
  );
}
