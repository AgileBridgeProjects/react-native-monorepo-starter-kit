import { Pressable, View } from 'react-native';
import { colors, iconSize, palette } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/src/lib/cn';
import { Icon } from './icon';

export interface CheckboxIndicatorProps {
  checked: boolean;
  disabled?: boolean;
  /**
   * `wizard` matches the check-in flow's dark-card aesthetic (accent/white,
   * 28px) — used by `PreferenceCheckboxRow`. `default` matches the plain
   * settings-list rows (primary/border, 24px).
   */
  variant?: 'default' | 'wizard';
}

/** The checkbox box + checkmark, shared by every checkbox in the app. Embed
 * this directly when the tap target is a larger surrounding Pressable (e.g.
 * a full-row card); use `Checkbox` when the box itself is the tap target. */
export function CheckboxIndicator({
  checked,
  disabled,
  variant = 'default',
}: CheckboxIndicatorProps) {
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;
  const isWizard = variant === 'wizard';

  return (
    <View
      className={cn(
        'items-center justify-center rounded-md border-2',
        isWizard ? 'h-7 w-7' : 'h-6 w-6',
        checked
          ? isWizard
            ? 'border-accent bg-accent'
            : 'border-primary bg-primary'
          : isWizard
            ? 'border-white'
            : 'border-border',
        disabled && 'opacity-40',
      )}
    >
      {checked && (
        <Icon
          name="checkmark"
          size={isWizard ? iconSize.sm : iconSize.xs}
          color={isWizard ? palette.neutral[900] : colors[colorScheme].primaryForeground}
          weight="bold"
        />
      )}
    </View>
  );
}

export interface CheckboxProps {
  checked: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
  testID?: string;
}

/** Standalone checkbox where the box itself is the tap target (e.g. a settings row). */
export function Checkbox({
  checked,
  onValueChange,
  disabled,
  accessibilityLabel,
  testID,
}: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        onValueChange(!checked);
      }}
      testID={testID}
    >
      <CheckboxIndicator checked={checked} disabled={disabled} />
    </Pressable>
  );
}
