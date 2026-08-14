import { Button, Host, HStack } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  accessibilityLabel,
  accessibilityValue,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  foregroundStyle,
  frame,
  glassEffect,
  imageScale,
  labelStyle,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { useTranslation } from '@lib/i18n';
import { View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';
import { colors, palette, spacing, touchTarget } from '@/constants/tokens';
import type { IconSegmentedControlProps } from './icon-segmented-control.types';

/**
 * iOS variant of {@link IconSegmentedControl}: a real `glassEffect` capsule instead of the base
 * component's hand-styled translucent approximation — RN has no cross-platform backdrop blur, so
 * the base one stands in for Android/web, but iOS can have the native Liquid Glass material
 * directly. Mirrors `SegmentedTabsPill`'s iOS variant's per-button glass approach: the outer
 * capsule keeps the default (untinted) glass, and only the selected segment gets its own white
 * glass circle — `glassProminent` here rendered as the system's blue accent instead, which read
 * wrong against this screen. Its icon switches to the system's standard dark ink so it stays
 * legible against that white circle.
 */
export function IconSegmentedControl<TValue extends string>({
  items,
  selectedValue,
  onSelectValue,
  testID,
}: IconSegmentedControlProps<TValue>) {
  const { t } = useTranslation('common');

  return (
    <View testID={testID}>
      <Host matchContents>
        <HStack
          spacing={spacing.xs}
          modifiers={[
            padding({ horizontal: spacing.xs, vertical: spacing.xs }),
            glassEffect({ glass: { variant: 'regular', interactive: true }, shape: 'capsule' }),
          ]}
        >
          {items.map((item) => {
            const selected = item.value === selectedValue;

            return (
              <Button
                key={item.value}
                label={item.accessibilityLabel}
                systemImage={item.icon as SFSymbol}
                onPress={() => onSelectValue(item.value)}
                testID={item.testID}
                modifiers={[
                  buttonStyle('plain'),
                  buttonBorderShape('circle'),
                  controlSize('regular'),
                  imageScale('medium'),
                  labelStyle('iconOnly'),
                  foregroundStyle(selected ? colors.light.text : palette.white.DEFAULT),
                  frame({ width: touchTarget, height: touchTarget }),
                  ...(selected
                    ? [
                        glassEffect({
                          glass: {
                            variant: 'regular',
                            interactive: true,
                            tint: palette.white.DEFAULT,
                          },
                          shape: 'circle',
                        }),
                      ]
                    : []),
                  accessibilityLabel(item.accessibilityLabel),
                  accessibilityValue(
                    selected ? t('segmentedTabs.selected') : t('segmentedTabs.notSelected'),
                  ),
                  ...(item.testID ? [accessibilityIdentifier(item.testID)] : []),
                ]}
              />
            );
          })}
        </HStack>
      </Host>
    </View>
  );
}
