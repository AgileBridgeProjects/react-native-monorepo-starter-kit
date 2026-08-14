/**
 * ActionSheet — Android implementation.
 * Uses the native Jetpack Compose `ModalBottomSheet` from @expo/ui.
 */
import { ModalBottomSheet } from '@expo/ui/jetpack-compose';
import type React from 'react';
import { View } from 'react-native';

export interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function ActionSheet({ visible, onClose, children }: ActionSheetProps) {
  if (!visible) return null;

  return (
    <ModalBottomSheet
      onDismissRequest={onClose}
      skipPartiallyExpanded
      showDragHandle
      properties={{ shouldDismissOnClickOutside: true, shouldDismissOnBackPress: true }}
    >
      <View className="gap-lg px-lg pb-xl pt-xs bg-surface">{children}</View>
    </ModalBottomSheet>
  );
}
