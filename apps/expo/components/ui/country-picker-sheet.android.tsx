/**
 * CountryPickerSheet — Android implementation.
 * Uses the native Jetpack Compose `ModalBottomSheet` from @expo/ui/jetpack-compose.
 */
import { ModalBottomSheet } from '@expo/ui/jetpack-compose';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CountryPickerContent } from './country-picker-sheet-content';

export interface CountryPickerSheetProps {
  visible: boolean;
  selected: string;
  onSelect: (code: string) => void;
  onClose: () => void;
  /** Web-only: anchors the dropdown to the trigger. Ignored on native. */
  anchorRef?: { current: unknown };
}

export function CountryPickerSheet({
  visible,
  selected,
  onSelect,
  onClose,
}: CountryPickerSheetProps) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <ModalBottomSheet
      onDismissRequest={onClose}
      skipPartiallyExpanded
      showDragHandle
      properties={{ shouldDismissOnClickOutside: true, shouldDismissOnBackPress: true }}
    >
      <CountryPickerContent
        selected={selected}
        onSelect={onSelect}
        onClose={onClose}
        insetBottom={insets.bottom}
      />
    </ModalBottomSheet>
  );
}
