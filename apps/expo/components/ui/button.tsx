import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import type { ReactNode } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { authControlHeight, palette } from '@/constants/tokens';
import { cn } from '@/src/lib/cn';

// ─── Variants ────────────────────────────────────────────────────────────────

const buttonVariants = cva('flex-row items-center justify-center active:opacity-80', {
  variants: {
    variant: {
      primary: 'bg-primary',
      secondary: 'bg-surface border border-border',
      outline: 'border border-primary bg-transparent',
      ghost: 'bg-transparent',
      destructive: 'bg-error',
      /** Solid brand navy — a filled secondary action on dark surfaces, where
       * `outline`'s transparent fill disappears into the background. */
      brandDark: 'bg-brand-blue-dark',
    },
    // Radius lives per-size (not in the shared base) because `auth` needs a
    // different radius than every other size — keeping it here means the
    // `auth` size doesn't have to override a base utility via className
    // merge order, which tailwind-merge can't do reliably for a custom
    // (non-built-in) radius value.
    //
    // `auth`'s height is NOT a Tailwind class — 55px doesn't align to the 4px
    // spacing grid, and a one-off `h-auth-button` utility class would just be
    // a second, unenforced copy of `authControlHeight.button`. Applied as an
    // inline style below instead, reading that shared token directly.
    size: {
      sm: 'rounded-xl px-md py-xs',
      md: 'rounded-xl px-lg py-sm',
      lg: 'rounded-xl px-xl py-md',
      /** Sign-In screen CTA geometry (Figma "Sign In" frame) — a
       * dedicated size rather than overloading `lg`, which unrelated buttons
       * (update-banner restart, provider-conflict dismiss) also use.
       * `rounded-auth-control`, not the smaller `rounded-pill`: at 55px tall,
       * `rounded-pill`'s 15px radius is less than half the height, so it
       * doesn't read as a full pill/stadium shape. */
      auth: 'rounded-auth-control px-xl',
    },
    fullWidth: {
      true: 'w-full md:max-w-fit',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
    fullWidth: false,
  },
});

const buttonTextVariants = cva('font-semibold', {
  variants: {
    variant: {
      primary: 'text-primary-foreground',
      secondary: 'text-text',
      outline: 'text-primary',
      ghost: 'text-primary',
      destructive: 'text-primary-foreground',
      brandDark: 'text-primary-foreground',
    },
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      auth: 'text-lg',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

// ─── Spinner color map ───────────────────────────────────────────────────────

const spinnerColorMap: Record<string, string> = {
  primary: palette.neutral[0],
  secondary: palette.neutral[600],
  outline: palette.primary[500],
  ghost: palette.primary[500],
  destructive: palette.neutral[0],
  brandDark: palette.neutral[0],
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  /** Button label text or icon content. */
  children: ReactNode;
  /**
   * Glyph rendered before a string label, sharing the label's own type styling.
   * Only applies to string children — a caller passing its own node already owns
   * the whole layout.
   */
  icon?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  textClassName?: string;
  /** Override the Pressable style (e.g. dynamic runtime backgroundColor). */
  style?: StyleProp<ViewStyle>;
  /** Override the label text style (e.g. dynamic runtime colour to match a border). */
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Button({
  children,
  icon,
  variant,
  size,
  fullWidth,
  onPress,
  disabled = false,
  loading = false,
  className,
  textClassName,
  style,
  textStyle,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  // `size` is the raw prop, undefined unless the caller passes it — cva resolves its own
  // default internally for classNames, but the inline height/text-line logic below reads
  // this prop directly, so it needs the same fallback or it drifts from cva's default.
  const resolvedSize = size ?? 'md';

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle} className={cn(fullWidth && 'w-full')}>
      <Pressable
        className={cn(
          buttonVariants({ variant, size, fullWidth }),
          isDisabled && 'opacity-50',
          className,
        )}
        style={resolvedSize === 'auth' ? [{ height: authControlHeight.button }, style] : style}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 300 });
        }}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={
          accessibilityLabel ?? (typeof children === 'string' ? children : undefined)
        }
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        testID={testID}
      >
        {loading ? (
          <ActivityIndicator size="small" color={spinnerColorMap[variant ?? 'primary']} />
        ) : typeof children === 'string' ? (
          // Single line always: `auth` has a fixed 55px height, so a label that wraps
          // overflows it and reads as clipped, top-aligned text rather than a centred
          // label. Ellipsising is visible and self-explanatory; clipping is not.
          // The Pressable is already a centred flex row, so the glyph is a plain
          // sibling of the label rather than a wrapper — a button with no icon
          // renders exactly the tree it always did.
          <>
            {icon && <View className="mr-sm">{icon}</View>}
            <Text
              numberOfLines={1}
              className={cn(buttonTextVariants({ variant, size }), textClassName)}
              style={textStyle}
            >
              {children}
            </Text>
          </>
        ) : (
          children
        )}
      </Pressable>
    </Animated.View>
  );
}

export type { ButtonProps };
export { buttonTextVariants, buttonVariants };
