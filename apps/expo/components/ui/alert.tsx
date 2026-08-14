import { palette } from '@starterkit/shared';
import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import { Pressable, Text, View } from 'react-native';
import { cn } from '@/src/lib/cn';
import { Icon } from './icon';

// ─── Variants ────────────────────────────────────────────────────────────────

const alertVariants = cva('rounded-md px-md py-sm mb-md', {
  variants: {
    variant: {
      error: 'bg-error/10 border border-error',
      warning: 'bg-warning/10 border border-warning',
      info: 'bg-info/10 border border-info',
      success: 'bg-success/10 border border-success',
    },
  },
  defaultVariants: {
    variant: 'error',
  },
});

const alertTextVariants = cva('text-sm', {
  variants: {
    variant: {
      error: 'text-error',
      warning: 'text-warning',
      info: 'text-info',
      success: 'text-success',
    },
  },
  defaultVariants: {
    variant: 'error',
  },
});

// ─── Props ───────────────────────────────────────────────────────────────────

const DISMISS_ICON_COLORS: Record<NonNullable<AlertProps['variant']>, string> = {
  error: palette.status.error,
  warning: palette.status.warning,
  info: palette.status.info,
  success: palette.status.success,
};

interface AlertProps extends VariantProps<typeof alertVariants> {
  /** The alert message. If nullish, the component renders nothing. */
  message: string | null | undefined;
  className?: string;
  /**
   * When provided, renders a dismiss (✕) button that calls this on press.
   * Use to let users clear an error without it permanently shifting the layout.
   */
  onDismiss?: () => void;
  testID?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Alert({ message, variant, className, onDismiss, testID }: AlertProps) {
  if (!message) return null;
  return (
    <View
      testID={testID}
      className={cn(alertVariants({ variant }), 'flex-row items-start gap-sm', className)}
      accessibilityRole="alert"
    >
      <Text className={cn(alertTextVariants({ variant }), 'flex-1')}>{message}</Text>
      {onDismiss && (
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          className="touch-target -my-xs -mr-xs items-center justify-center px-xs"
        >
          <Icon name="xmark" size={14} color={DISMISS_ICON_COLORS[variant ?? 'error']} />
        </Pressable>
      )}
    </View>
  );
}

export type { AlertProps };
export { alertTextVariants, alertVariants };
