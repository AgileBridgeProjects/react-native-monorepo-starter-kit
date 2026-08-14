import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import { forwardRef, useEffect, useState } from 'react';
import type { TextInputProps } from 'react-native';
import { Pressable, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Icon } from '@/components/ui/icon';
import { animationConfig } from '@/constants/animations';
import { authControlHeight, fontSize, iconSize, palette } from '@/constants/tokens';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/src/lib/cn';
import { useTranslation } from '@/src/lib/i18n';

/** Floating-label move duration (ms) — a small local move, shorter than a
 * full-screen entrance. */
const FLOAT_DURATION = 200;
// Material's "standard" curve — eases in and out, reads less abrupt than a
// pure ease-out for this diagonal move-and-shrink.
const FLOAT_EASING = animationConfig.easing.standard;

// ─── Variants ────────────────────────────────────────────────────────────────

// Vertical padding lives per-size, never in the base — `py-0` in the base and a
// `py-*` override in a size/className can't be deduped by tailwind-merge (the
// custom spacing scale isn't in its default config), so both would survive and
// which one wins would come down to class order.
// `font-body` (Poppins): without it the entered text falls back to the OS font,
// which has different vertical metrics to every label and control around it —
// the text then reads as sitting slightly high inside a centred field.
const inputVariants = cva('px-md font-body text-text text-base', {
  variants: {
    // `outlinedDark` is the only variant, and the default: translucent fill + white text, no
    // border — the treatment for a field anywhere on the app's dark surfaces. ONE variant, not
    // one per surface: the fill is a white overlay (see palette.blue.inputFill), so it lifts
    // whatever is behind it and reads correctly on a screen, on a card, and in a bottom sheet
    // alike. Two opaque navies were tried before this and each was invisible on one of those.
    //
    // A light `filled` grey and a white `outlined` used to sit here as the default and the auth
    // treatment. Every real caller had already moved to `outlinedDark`, so all the default did
    // was hand a light-on-light field to anyone who forgot the prop, which is exactly how the
    // survey's fill-in question shipped with an unreadable input. Deleted rather than kept as
    // options nobody picks.
    variant: {
      outlinedDark: 'border border-transparent bg-brand-blue-input-fill text-white',
    },
    state: {
      default: '',
      error: 'border-error',
      focused: 'border-primary',
      disabled: 'opacity-50',
    },
    // `default`: the app's standard input geometry. `auth`: the redesigned
    // Sign-In screen's geometry — pill-shaped (`rounded-auth-control`,
    // taller than half the height so the ends stay fully round), 52px height.
    // Shared across every screen that opts in, rather than per-instance
    // overrides.
    //
    // `auth`'s height is NOT a Tailwind class — 52px doesn't align to the 4px
    // spacing grid, and a one-off `h-auth-input` utility class would just be
    // a second, unenforced copy of `authControlHeight.input`. Applied as an
    // inline style below instead, reading that shared token directly.
    //
    // `pill` is a fully-round single-line field at the shared control height
    // (applied inline below, like `auth`) with zero vertical padding, so the
    // platform centres the text in the box — the same geometry a flex-centred
    // control such as a select gets. Reached through `PillInput`, which the
    // onboarding forms use, rather than by passing the size directly.
    // `multiline` instead grows with its content, so it takes its height from
    // its own padding.
    size: {
      default: 'h-12 rounded-xl py-0',
      auth: 'rounded-auth-control py-0',
      pill: 'rounded-full py-0',
      multiline: 'h-auto rounded-2xl py-sm',
    },
  },
  defaultVariants: {
    variant: 'outlinedDark',
    state: 'default',
    size: 'default',
  },
});

// ─── Props ───────────────────────────────────────────────────────────────────

interface InputProps
  extends Omit<TextInputProps, 'className'>,
    Omit<VariantProps<typeof inputVariants>, 'state'> {
  /** Optional label displayed above the input. */
  label?: string;
  /** Additional classes for the label text (e.g. to recolour it on a dark background). */
  labelClassName?: string;
  /** When true, `label` renders as a floating label: sitting inside the field
   * (in the placeholder's spot) at rest, animating up above the border when
   * focused or once the field has a value. Opt-in — every other `Input` keeps
   * the label as a static line above the field. */
  floatingLabel?: boolean;
  /** Validation error message displayed below the input. */
  error?: string;
  /** Helper text shown below the input when there's no error. */
  hint?: string;
  /** Additional classes for the outer container. */
  containerClassName?: string;
  /** Additional classes for the TextInput itself. */
  className?: string;
  /** Icon rendered on the left inside the input. */
  leftIcon?: React.ReactNode;
  /** Icon rendered on the right inside the input (not shown when secureTextEntry is set — the eye toggle takes that slot). */
  rightIcon?: React.ReactNode;
}

// ─── Component ───────────────────────────────────────────────────────────────

// Reserved space above the input that the floating label moves into — sized to
// match today's static label's box (text-sm line + mb-xs gap), so the input's
// own position never shifts as the label animates between the two spots.
const LABEL_SLOT_HEIGHT = 22;
// Approximate line height of the resting (fontSize.base) label — used to
// vertically center it inside the input box.
const RESTING_LABEL_LINE_HEIGHT = 20;

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      labelClassName,
      floatingLabel,
      error,
      hint,
      variant,
      size,
      containerClassName,
      className,
      onFocus,
      onBlur,
      leftIcon,
      rightIcon,
      secureTextEntry,
      placeholderTextColor,
      style,
      ...textInputProps
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { t } = useTranslation('auth');
    const isDisabled = textInputProps.editable === false;
    const state = isDisabled ? 'disabled' : error ? 'error' : isFocused ? 'focused' : 'default';
    // `outlinedDark` sits on a dark card — the label, eye
    // toggle, and placeholder default to white instead of the standard greys.
    const isDark = variant === 'outlinedDark';

    // ── Floating label (opt-in via `floatingLabel`) ───────────────────────────
    // Stays floated after blur once something's typed, so it never jumps back
    // down over existing text.
    const hasValue = !!textInputProps.value;
    const isFloating = isFocused || hasValue;
    const reducedMotion = useReducedMotion();
    const progress = useSharedValue(isFloating ? 1 : 0);

    useEffect(() => {
      // This label communicates real field state, not decoration — under
      // reduced motion it still snaps to the correct spot, just instantly.
      progress.value = withTiming(isFloating ? 1 : 0, {
        duration: reducedMotion ? 0 : FLOAT_DURATION,
        easing: FLOAT_EASING,
      });
    }, [isFloating, reducedMotion, progress]);

    // `pill` renders at the same height as `auth`, just reached via padding.
    const inputBoxHeight = size === 'auth' || size === 'pill' ? authControlHeight.input : 48;
    const restingY = LABEL_SLOT_HEIGHT + (inputBoxHeight - RESTING_LABEL_LINE_HEIGHT) / 2;
    // Resting X matches where the TextInput's own text starts (left-11/44px
    // with an icon, left-md/16px without — see the `pl-11` given to the
    // TextInput below). Floated X is 0 — flush with the field's left edge,
    // same as the static (non-floating) label, regardless of any icon.
    const restingX = leftIcon ? 44 : 16;
    // Plain 2-point lerp (progress.value only ever ranges over [0, 1], driven
    // by the withTiming target above) — no need for the general `interpolate`
    // helper here.
    const labelAnimatedStyle = useAnimatedStyle(() => {
      const p = progress.value;
      return {
        transform: [{ translateX: restingX * (1 - p) }, { translateY: restingY * (1 - p) }],
        fontSize: fontSize.base - (fontSize.base - fontSize.sm) * p,
      };
    });

    const inputRow = (
      <View className="relative">
        {leftIcon && (
          <View className="absolute left-3 top-0 bottom-0 justify-center z-[1]">{leftIcon}</View>
        )}

        <TextInput
          ref={ref}
          className={cn(
            inputVariants({ variant, state, size }),
            leftIcon && 'pl-11',
            (secureTextEntry || rightIcon) && 'pr-11',
            className,
          )}
          secureTextEntry={secureTextEntry && !showPassword}
          style={
            size === 'auth' || size === 'pill'
              ? [{ height: authControlHeight.input }, style]
              : style
          }
          // Grey on both treatments — a white placeholder on the dark fill is
          // indistinguishable from entered text.
          placeholderTextColor={
            placeholderTextColor ?? (isDark ? palette.neutral[400] : palette.neutral[500])
          }
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          accessibilityLabel={label}
          accessibilityState={{ disabled: textInputProps.editable === false }}
          {...textInputProps}
        />

        {secureTextEntry && (
          <Pressable
            className="absolute right-3 top-0 bottom-0 justify-center z-[1]"
            onPress={() => setShowPassword((v) => !v)}
            accessibilityLabel={
              showPassword ? t('passwordInput.hidePassword') : t('passwordInput.showPassword')
            }
            accessibilityRole="button"
          >
            <Icon
              name={showPassword ? 'eye.slash' : 'eye'}
              size={iconSize.sm}
              color={isDark ? palette.white.DEFAULT : palette.neutral[400]}
            />
          </Pressable>
        )}

        {!secureTextEntry && rightIcon && (
          <View className="absolute right-3 top-0 bottom-0 justify-center z-[1]">{rightIcon}</View>
        )}
      </View>
    );

    return (
      <View className={cn('mb-md', containerClassName)}>
        {floatingLabel && label ? (
          <View className="relative">
            <Animated.Text
              style={labelAnimatedStyle}
              className={cn(
                'absolute left-0 z-[1] text-text-secondary',
                isDark && 'text-white/60',
                labelClassName,
              )}
              pointerEvents="none"
            >
              {label}
            </Animated.Text>
            <View style={{ marginTop: LABEL_SLOT_HEIGHT }}>{inputRow}</View>
          </View>
        ) : (
          <>
            {label && (
              <Text
                className={cn(
                  'text-text-secondary text-sm mb-xs',
                  isDark && 'text-white',
                  labelClassName,
                )}
              >
                {label}
              </Text>
            )}
            {inputRow}
          </>
        )}

        {error && (
          <Text className="text-error text-xs mt-xs" accessibilityRole="alert">
            {error}
          </Text>
        )}

        {!error && hint && <Text className="text-text-muted text-xs mt-xs">{hint}</Text>}
      </View>
    );
  },
);

Input.displayName = 'Input';

export type { InputProps };
export { inputVariants };
