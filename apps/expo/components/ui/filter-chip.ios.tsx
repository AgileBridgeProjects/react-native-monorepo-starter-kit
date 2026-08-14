import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Pressable, View } from 'react-native';
import { borderRadius, palette } from '@/constants/tokens';
import { cn } from '@/src/lib/cn';
import type { FilterChipProps } from './filter-chip.types';
import { Typography } from './typography';

export type { FilterChipProps } from './filter-chip.types';

/**
 * iOS 26+ uses the system Liquid Glass material per chip, with a cyan tint for the selected
 * scope. Content remains a sibling above the childless glass background so every chip stays
 * tappable — the composition required by expo-glass-effect on device.
 */
export function FilterChip({ label, selected, testID, onPress }: FilterChipProps) {
  const isGlass = isLiquidGlassAvailable();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      className="touch-target items-center justify-center active:opacity-70"
    >
      <View
        className={cn(
          'h-8 items-center justify-center overflow-hidden rounded-full border px-sm',
          !isGlass &&
            (selected ? 'border-accent bg-accent' : 'border-white/15 bg-brand-blue-card-dark'),
          isGlass && (selected ? 'border-accent/70' : 'border-white/15'),
        )}
      >
        {isGlass && (
          <GlassView
            glassEffectStyle="regular"
            colorScheme="dark"
            tintColor={selected ? palette.accent[500] : undefined}
            pointerEvents="none"
            importantForAccessibility="no"
            accessibilityElementsHidden
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              borderRadius: borderRadius.full,
            }}
          />
        )}
        <Typography
          variant="caption"
          className={selected ? 'font-semibold text-brand-blue-screen' : 'font-medium text-white'}
        >
          {label}
        </Typography>
      </View>
    </Pressable>
  );
}
