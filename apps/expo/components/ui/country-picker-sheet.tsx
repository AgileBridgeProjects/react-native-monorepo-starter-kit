/**
 * CountryPickerSheet — iOS + native fallback implementation.
 * Uses a React Native Modal with `pageSheet` presentation, which renders as a
 * native iOS sheet (rounded card, swipe-to-dismiss). Because the content is pure
 * React Native — not embedded in a SwiftUI Host — the list scrolls and the Done
 * button responds to presses normally.
 *
 * Platform files:
 *   country-picker-sheet.android.tsx → Jetpack Compose ModalBottomSheet
 *   country-picker-sheet.web.tsx     → Web anchored dropdown
 *   country-picker-sheet.tsx         → React Native Modal (iOS + fallback, this file)
 */
import { Modal, SafeAreaView, View } from 'react-native';

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
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onDismiss={onClose}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <CountryPickerContent selected={selected} onSelect={onSelect} onClose={onClose} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
