/**
 * BottomSheet — iOS implementation.
 * The native SwiftUI sheet (`UISheetPresentationController`) via @expo/ui.
 *
 * Platform files:
 *   bottom-sheet.ios.tsx     → SwiftUI BottomSheet (this file)
 *   bottom-sheet.android.tsx → Jetpack Compose ModalBottomSheet
 *   bottom-sheet.tsx         → Web centered dialog
 *
 * `fitToContents` is the whole point: the sheet sizes to its body, which is what the
 * stats-import pickers needed. Their earlier `Modal presentationStyle="pageSheet"` was also a
 * native sheet, but RN's Modal exposes no detents, so it could only ever be near-full-height —
 * a short list stranded at the top of a full-height panel. The platform does this properly;
 * scrim, drag-to-dismiss and the presentation curve all come free.
 *
 * Body goes through `RNHostView` so the React Native tree inside (Input, FlatList, Typography)
 * renders normally — NativeWind classes do not resolve directly under a SwiftUI `Host`, but they
 * do inside an RNHostView.
 *
 * One sizing mode, always hug-to-content. A `fullHeight` escape hatch briefly existed for bodies
 * thought too tall to hug (the stats-import create-match form), flipping `fitToContents` and
 * `matchContents` to `false` — `@expo/ui`'s reverse sizing flow, "make RN as big as SwiftUI
 * wants". That path renders nothing at all: an empty grey sheet, no header, no fields.
 * It was never the fix that body needed anyway — it was compensating for a `flex-1` child that
 * collapsed to zero inside a hugging parent, which is a caller-side bug and is fixed there.
 * Anything that hugs its content works here; a flex child never will, on any sizing mode.
 *
 * No background and no bottom inset of our own. The system sheet material provides the surface
 * (painting navy over it left a seam where `fitToContents`' own bottom inset began), and that
 * inset already clears the home indicator.
 *
 * ## The Host must outlive `visible`
 *
 * This used to be `if (!visible) return null`, which looks harmless and is not: it tore the
 * SwiftUI host down the instant the caller flipped `visible`, WHILE the sheet was still
 * presented. `.sheet(isPresented:)` never saw the binding go false, so UIKit was left holding a
 * presented view controller that nothing would ever dismiss — and from then on every later
 * present was silently a no-op. Symptom: a sheet that opens exactly once per session and then
 * "does nothing", with touches sometimes swallowed by the orphaned presentation.
 *
 * So the mount is lazy but the unmount is not ours to decide: `isPresented` drives a real
 * SwiftUI dismissal, and only `onDismiss` — the platform's own post-dismissal callback — takes
 * the Host back out of the tree. Nothing is mounted between presentations, so this costs no
 * layout anywhere.
 */
import { Host, RNHostView, BottomSheet as UIBottomSheet } from '@expo/ui/swift-ui';
import { useState } from 'react';
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
  // Render-phase update rather than an effect, mirroring `@expo/ui`'s own BottomSheet: an
  // effect would cost a frame between the caller asking and the sheet presenting.
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);

  if (!mounted) return null;

  return (
    <Host>
      <UIBottomSheet
        isPresented={visible}
        onIsPresentedChange={(presented) => {
          if (!presented) onClose();
        }}
        // Fires after iOS has finished dismissing — the only safe moment to unmount.
        onDismiss={() => setMounted(false)}
        fitToContents
      >
        <RNHostView matchContents>
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
        </RNHostView>
      </UIBottomSheet>
    </Host>
  );
}
