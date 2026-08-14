/**
 * BottomSheet — Android implementation.
 * The native Jetpack Compose `ModalBottomSheet` via @expo/ui.
 *
 * `skipPartiallyExpanded` keeps it to a single content-sized state rather than a half-open
 * detent, matching iOS's `fitToContents`; `showDragHandle` gives the platform's own grabber so
 * we don't draw one.
 *
 * Unlike iOS, the surface is painted here: Compose's default sheet container is light, which
 * would leave the shared content's white text unreadable.
 */
import { ModalBottomSheet } from '@expo/ui/jetpack-compose';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomSheetProps } from './bottom-sheet.types';
import { BottomSheetContent } from './bottom-sheet-content';

export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  closeLabel,
  children,
  footer,
  testID,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <ModalBottomSheet
      onDismissRequest={onClose}
      skipPartiallyExpanded
      showDragHandle
      properties={{ shouldDismissOnClickOutside: true, shouldDismissOnBackPress: true }}
    >
      <View className="bg-brand-blue-card-dark">
        <BottomSheetContent
          title={title}
          subtitle={subtitle}
          closeLabel={closeLabel}
          onClose={onClose}
          footer={footer}
          insetBottom={insets.bottom}
          testID={testID}
        >
          {children}
        </BottomSheetContent>
      </View>
    </ModalBottomSheet>
  );
}
