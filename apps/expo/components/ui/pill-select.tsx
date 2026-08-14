import { useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { iconSize, palette } from '@/constants/tokens';
import { cn } from '@/src/lib/cn';
import { Icon } from './icon';
import { PILL_FIELD_HEIGHT, PillFieldLabel } from './pill-input';
import type { ChipOption } from './single-select-pill-group';
import { Typography } from './typography';

interface PillSelectProps {
  label: string;
  placeholder: string;
  options: ChipOption[];
  value: string | null;
  onChange: (next: string) => void;
  testID?: string;
}

/** Dark-surface dropdown select matching PillInput's geometry, so a select and a text field
 * read as one control family. */
export function PillSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
  testID,
}: PillSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <View className="gap-xs">
      <PillFieldLabel>{label}</PillFieldLabel>
      <Pressable
        onPress={() => setIsOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        testID={testID}
        // Same height/shape as PillInput so a select and a text field
        // read as one control family.
        style={{ height: PILL_FIELD_HEIGHT }}
        className="flex-row items-center justify-between rounded-full bg-brand-blue-input-fill px-md"
      >
        {/* `body` (16px) matches PillInput's text — `caption` read
            noticeably smaller than the fields either side of it. Unselected
            reads as a placeholder, so it greys out like the inputs do. */}
        <Typography variant="body" className={selectedLabel ? 'text-white' : 'text-neutral-400'}>
          {selectedLabel ?? placeholder}
        </Typography>
        <Icon name="chevron.down" size={iconSize.xs} color={palette.white.DEFAULT} />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 p-lg"
          onPress={() => setIsOpen(false)}
        >
          <View className="max-h-96 w-full max-w-auth-form rounded-2xl bg-surface-elevated p-md">
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    setIsOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  className={cn(
                    'touch-target justify-center rounded-lg px-md py-sm',
                    item.value === value && 'bg-primary/10',
                  )}
                >
                  <Typography variant="body">{item.label}</Typography>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
