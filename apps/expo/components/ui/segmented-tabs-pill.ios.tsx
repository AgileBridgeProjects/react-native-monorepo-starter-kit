import { Button, Host, HStack } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  accessibilityLabel,
  accessibilityValue,
  buttonStyle,
  foregroundStyle,
  frame,
  glassEffect,
} from '@expo/ui/swift-ui/modifiers';
import { useTranslation } from '@lib/i18n';
import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { View } from 'react-native';
import { palette, touchTarget } from '@/constants/tokens';
import type { SegmentedTabsPillProps } from './segmented-tabs-pill.types';

export function SegmentedTabsPill<TValue extends string>({
  items,
  selectedValue,
  onSelectValue,
}: SegmentedTabsPillProps<TValue>) {
  const { t } = useTranslation('common');
  const [width, setWidth] = useState(0);
  const segmentWidth = items.length > 0 ? width / items.length : 0;

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  return (
    <View className="touch-target w-full" onLayout={handleLayout}>
      {segmentWidth > 0 && (
        <Host matchContents>
          <HStack
            spacing={0}
            modifiers={[
              frame({ width, height: touchTarget }),
              glassEffect({
                glass: { variant: 'regular', interactive: true },
                shape: 'capsule',
              }),
            ]}
          >
            {items.map((item) => {
              const isSelected = item.value === selectedValue;
              return (
                <Button
                  key={item.value}
                  label={item.label}
                  onPress={() => onSelectValue(item.value)}
                  testID={item.testID}
                  modifiers={[
                    buttonStyle('plain'),
                    foregroundStyle(isSelected ? palette.blue.screen : palette.white.DEFAULT),
                    frame({ width: segmentWidth, height: touchTarget }),
                    ...(isSelected
                      ? [
                          glassEffect({
                            glass: {
                              variant: 'regular',
                              interactive: true,
                              tint: palette.white.DEFAULT,
                            },
                            shape: 'capsule',
                          }),
                        ]
                      : []),
                    accessibilityLabel(item.accessibilityLabel ?? item.label),
                    accessibilityValue(
                      isSelected ? t('segmentedTabs.selected') : t('segmentedTabs.notSelected'),
                    ),
                    ...(item.testID ? [accessibilityIdentifier(item.testID)] : []),
                  ]}
                />
              );
            })}
          </HStack>
        </Host>
      )}
    </View>
  );
}
