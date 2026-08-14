import { Pressable } from 'react-native';
import { iconSize, palette, shadows } from '@/constants/tokens';
import { hapticLight } from '@/src/lib/utils/haptics';
import type { GlassFabProps } from './glass-fab.types';
import { Icon } from './icon';

export type { GlassFabProps } from './glass-fab.types';

/**
 * Web/fallback floating action button. iOS 26+ renders `glass-fab.ios` (native SwiftUI Liquid
 * Glass); Android renders `glass-fab.android` (solid cyan). Shared so every screen with a
 * floating "primary action" button (Reflect, Messages, ...) looks and behaves identically.
 */
export function GlassFab({ icon, label, onPress, testID, bottomOffset }: GlassFabProps) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="touch-target absolute right-lg h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-brand-blue-card-dark active:opacity-80"
      style={[{ bottom: bottomOffset }, shadows.glow]}
      onPressIn={() => void hapticLight()}
    >
      <Icon name={icon} size={iconSize.sm} color={palette.cyan.DEFAULT} weight="semibold" />
    </Pressable>
  );
}
