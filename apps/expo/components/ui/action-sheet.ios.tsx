/**
 * ActionSheet — iOS implementation.
 * Uses the native SwiftUI `BottomSheet` from @expo/ui.
 *
 * NativeWind classes do not resolve inside a SwiftUI Host, so inline styles
 * with raw spacing values are used for the content wrapper.
 */
import { BottomSheet, Host } from '@expo/ui/swift-ui';
import { spacing } from '@starterkit/shared';
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
    <Host>
      <BottomSheet
        isPresented={visible}
        onIsPresentedChange={(presented) => {
          if (!presented) onClose();
        }}
        fitToContents
      >
        <View
          style={{
            gap: spacing.lg,
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.xl,
            paddingTop: spacing.md,
          }}
        >
          {children}
        </View>
      </BottomSheet>
    </Host>
  );
}
