/**
 * BottomSheet — web implementation.
 * A centred dialog via a React portal; there is no native sheet to delegate to on web.
 *
 * Platform files:
 *   bottom-sheet.ios.tsx     → SwiftUI BottomSheet
 *   bottom-sheet.android.tsx → Jetpack Compose ModalBottomSheet
 *   bottom-sheet.tsx         → Web centered dialog (this file)
 *
 * Mirrors action-sheet.tsx, which solves the same problem for the action sheet.
 */
import { createPortal } from 'react-dom';
import { View } from 'react-native';
import { overlay as overlayTokens } from '@/constants/tokens';
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
  if (!visible) return null;

  const dialog = (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        backgroundColor: overlayTokens.backdrop,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation wrapper */}
      <div
        role="presentation"
        style={{ width: '100%', maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        <View className="overflow-hidden rounded-2xl bg-brand-blue-card-dark shadow-2xl">
          <BottomSheetContent
            title={title}
            subtitle={subtitle}
            closeLabel={closeLabel}
            onClose={onClose}
            footer={footer}
            testID={testID}
          >
            {children}
          </BottomSheetContent>
        </View>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
