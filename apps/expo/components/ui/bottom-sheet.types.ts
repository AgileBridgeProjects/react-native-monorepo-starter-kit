import type { ReactNode } from 'react';

/**
 * Shared contract for the three BottomSheet platform implementations, so the iOS/Android/web
 * shells can't drift apart and callers get one API regardless of platform.
 */
export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Sheet heading, rendered beside the close control. */
  title: string;
  /** Optional second line under the title — context for what is being resolved. */
  subtitle?: string;
  /** Accessible name for the close control. */
  closeLabel: string;
  /** Sheet body. Anything: a list, a form, a set of options. */
  children: ReactNode;
  /** Pinned below the body, separated by a hairline (e.g. a primary CTA). */
  footer?: ReactNode;
  testID?: string;
}
