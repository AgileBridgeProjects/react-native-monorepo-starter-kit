/**
 * ActionSheet — web implementation.
 * Renders a centered dialog overlay via a React portal.
 *
 * Platform files:
 *   action-sheet.ios.tsx     → SwiftUI BottomSheet
 *   action-sheet.android.tsx → Jetpack Compose ModalBottomSheet
 *   action-sheet.tsx         → Web centered modal (this file)
 */
import type React from 'react';
import { createPortal } from 'react-dom';
import { View } from 'react-native';
import { overlay as overlayTokens } from '@/constants/tokens';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ActionSheetProps {
  /** Whether the sheet is visible. */
  visible: boolean;
  /** Called when the user dismisses (backdrop click / Escape key). */
  onClose: () => void;
  /** Sheet body content. */
  children: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActionSheet({ visible, onClose, children }: ActionSheetProps) {
  if (!visible) return null;

  const overlay = (
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
        <View className="gap-lg rounded-2xl bg-surface p-xl shadow-2xl">{children}</View>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
