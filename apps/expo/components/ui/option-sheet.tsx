import { iconSize } from '@starterkit/shared';
import { FlatList, Pressable } from 'react-native';

import { colors } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Icon } from './icon';
import { ModalSheet } from './modal-sheet';
import { Typography } from './typography';

export interface OptionSheetOption {
  value: string;
  label: string;
}

export interface OptionSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Sheet heading, rendered beside the close control. */
  title: string;
  /** Accessible name for the close control and the tap-outside-to-dismiss backdrop. */
  closeLabel: string;
  options: OptionSheetOption[];
  /** No match (including `undefined`) renders every option unchecked. */
  selectedValue: string | undefined;
  onSelect: (value: string) => void;
  /** Caps the list's own height so a long option list can't push the header off the top of the
   * screen — a fraction of window height, same idea as `BOTTOM_SHEET_BODY_MAX_HEIGHT_RATIO`. */
  bodyMaxHeight: number;
  testID?: string;
  optionTestID?: (value: string) => string;
}

/**
 * A single-select option list in a bottom sheet — "choose one of a short list of named things"
 * (a team, a filter, a category). Originally `TeamSwitcher`'s own sheet; pulled out to
 * `components/ui` once a second consumer needed the identical shape, then
 * rebuilt on top of `ModalSheet` once a third consumer needed the same shell with a different
 * body — see that component's doc comment for why it's a plain `Modal` rather
 * than the `@expo/ui`-backed `BottomSheet`.
 */
export function OptionSheet({
  visible,
  onClose,
  title,
  closeLabel,
  options,
  selectedValue,
  onSelect,
  bodyMaxHeight,
  testID,
  optionTestID,
}: OptionSheetProps) {
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title={title}
      closeLabel={closeLabel}
      testID={testID}
    >
      <FlatList
        data={options}
        keyExtractor={(option) => option.value}
        style={{ maxHeight: bodyMaxHeight }}
        contentContainerClassName="pb-lg"
        renderItem={({ item }) => {
          const isSelected = item.value === selectedValue;
          return (
            <Pressable
              testID={optionTestID?.(item.value)}
              onPress={() => onSelect(item.value)}
              className="flex-row items-center justify-between px-lg py-md"
              accessibilityRole="button"
            >
              <Typography
                variant="body"
                className={isSelected ? 'font-semibold text-primary' : 'text-text'}
              >
                {item.label}
              </Typography>
              {isSelected && (
                <Icon name="checkmark" size={iconSize.sm} color={colors[colorScheme].primary} />
              )}
            </Pressable>
          );
        }}
      />
    </ModalSheet>
  );
}
