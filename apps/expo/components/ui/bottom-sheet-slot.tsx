import type { ReactNode } from 'react';
import { View } from 'react-native';

export interface BottomSheetSlotProps {
  children: ReactNode;
}

/**
 * Zero-footprint mount point for a `BottomSheet` rendered from inside a form row, card, or any
 * other ScrollView-nested container.
 *
 * On iOS `BottomSheet` mounts a real SwiftUI `Host` into the React tree, and that Host is a
 * layout participant — it takes vertical space in whatever flex column it lands in. Worse, its
 * lifetime deliberately outlives `visible`: the sheet stays mounted through the platform's
 * dismissal animation and only unmounts on `onDismiss`. So a sheet mounted straight into a card
 * makes that card grow while open and for a beat after closing, then snap back — the flicker
 * that shows up as the whole form jumping when a sheet is dismissed.
 *
 * `absolute` takes the Host out of flex flow entirely, so it contributes no height in any state
 * and its mount/unmount can't move anything.
 *
 * `inset-x-0` is not optional. An absolutely-positioned view with no horizontal constraint
 * shrink-wraps its content, and the sheet's React body is measured against that frame — leaving
 * the presented sheet's content laid out at a fraction of the screen width, with wide empty
 * margins down both sides. Pinning both edges gives the body the full width to measure against
 * while keeping the wrapper out of the column's height. `pointerEvents="box-none"` keeps it from
 * swallowing touches meant for the row underneath.
 */
export function BottomSheetSlot({ children }: BottomSheetSlotProps) {
  return (
    <View className="absolute inset-x-0" pointerEvents="box-none">
      {children}
    </View>
  );
}
