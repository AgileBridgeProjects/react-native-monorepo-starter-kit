import { Button, Host } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  accessibilityLabel,
  buttonStyle,
  foregroundStyle,
  frame,
  glassEffect,
  imageScale,
  labelStyle,
} from '@expo/ui/swift-ui/modifiers';
import { View } from 'react-native';
import { palette, spacing } from '@/constants/tokens';
import { hapticLight } from '@/src/lib/utils/haptics';
import type { GlassFabProps } from './glass-fab.types';

export type { GlassFabProps } from './glass-fab.types';

/**
 * iPhone floating action button using SwiftUI's native Liquid Glass button style.
 *
 * SwiftUI falls back to its automatic button style before iOS 26, so the action remains
 * available on older supported devices.
 */
export function GlassFab({ systemImage, label, onPress, testID, bottomOffset }: GlassFabProps) {
  const handlePress = () => {
    void hapticLight();
    onPress();
  };

  return (
    <View
      pointerEvents="box-none"
      className="absolute right-lg z-10"
      style={{ bottom: bottomOffset }}
    >
      <Host matchContents>
        <Button
          label={label}
          systemImage={systemImage}
          onPress={handlePress}
          testID={testID}
          modifiers={[
            buttonStyle('plain'),
            imageScale('large'),
            labelStyle('iconOnly'),
            foregroundStyle(palette.white.DEFAULT),
            frame({
              width: spacing['3xl'],
              height: spacing['3xl'],
            }),
            glassEffect({
              glass: { variant: 'regular', interactive: true },
              shape: 'circle',
            }),
            accessibilityLabel(label),
            ...(testID ? [accessibilityIdentifier(testID)] : []),
          ]}
        />
      </Host>
    </View>
  );
}
