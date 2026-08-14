import { Pressable, View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { colors, iconSize } from '@/constants/tokens';
import { cn } from '@/src/lib/cn';
import type { IconSegmentedControlProps } from './icon-segmented-control.types';

/**
 * Compact icon-only segmented control, for switching how the same content is presented.
 *
 * Deliberately *not* backed by a native `glassEffect` host: the real material rendered as a
 * heavy opaque capsule against this screen's dark gradient. This is a hand-styled approximation
 * instead — translucent fill and a hairline edge, since RN has no cross-platform backdrop blur.
 * It reads better here and behaves identically on Android and web, so no platform split is
 * needed.
 *
 * Sits alongside {@link SegmentedTabs} rather than replacing it: that one is a full-width pill
 * with text labels for choosing *what* to show, this is a small trailing cluster for choosing
 * *how*.
 */
export function IconSegmentedControl<TValue extends string>({
  items,
  selectedValue,
  onSelectValue,
  className,
  testID,
}: IconSegmentedControlProps<TValue>) {
  return (
    <View
      className={cn(
        'flex-row items-center rounded-pill border border-white/15 bg-white/10 p-xs',
        className,
      )}
      accessibilityRole="tablist"
      testID={testID}
    >
      {items.map((item) => {
        const selected = item.value === selectedValue;

        return (
          <Pressable
            key={item.value}
            className={cn(
              'h-10 w-10 items-center justify-center rounded-pill',
              // Translucent rather than a solid white fill, so the screen's glow still shows
              // through the active segment the way it does through the capsule.
              selected && 'border border-white/25 bg-white/25',
            )}
            onPress={() => onSelectValue(item.value)}
            // The 40px segment is below the 44pt minimum touch target, but the shared
            // `touch-target` class is not the fix here — it sets min-h/min-w, which would grow
            // each segment and break the capsule's tight packing. hitSlop expands only the
            // hit-testing bounds, not layout, giving the same 44pt+ target without that cost.
            hitSlop={8}
            accessibilityRole="tab"
            accessibilityLabel={item.accessibilityLabel}
            accessibilityState={{ selected }}
            testID={item.testID}
          >
            {/* Dimmed rather than a different colour: the inactive glyph should recede without
                introducing a second ink into a two-icon control. */}
            <View className={cn(!selected && 'opacity-50')}>
              <Icon name={item.icon} size={iconSize.sm} color={colors.dark.text} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
