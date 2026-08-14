import { Pressable } from 'react-native';
import { iconSize, palette, shadows } from '@/constants/tokens';
import { hapticLight } from '@/src/lib/utils/haptics';
import type { GlassFabProps } from './glass-fab.types';
import { Icon } from './icon';

export type { GlassFabProps } from './glass-fab.types';

/** Android floating action button: a simple, high-contrast cyan button. */
export function GlassFab({ icon, label, onPress, testID, bottomOffset }: GlassFabProps) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      className="touch-target absolute right-lg z-10 h-18 w-18 items-center justify-center rounded-full bg-brand-cyan active:opacity-80"
      style={[{ bottom: bottomOffset }, shadows.glow]}
      onPressIn={() => void hapticLight()}
    >
      <Icon name={icon} size={iconSize.md} color={palette.blue.screen} weight="bold" />
    </Pressable>
  );
}
