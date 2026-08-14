import type { ReactNode } from 'react';
import { View } from 'react-native';

export interface AnchoredFooterProps {
  /** The row's controls — typically one or two buttons in `flex-1` wrappers. */
  children: ReactNode;
  /**
   * Bottom safe-area inset. Applied inside the panel rather than around it, so the fill
   * reaches the bottom of the screen instead of leaving a strip of background below it.
   */
  paddingBottom: number;
  testID?: string;
}

/**
 * Anchored button area pinned to the bottom of a screen, holding its primary action.
 *
 * Render it as a sibling of the scrolling/padded content rather than inside it — that is what
 * keeps it pinned however long the content above grows, and what lets its fill run edge to
 * edge. Translucent rather than a flat fill so it reads as a floating panel over the gradient
 * instead of a hard-edged bar; square top corners, not rounded.
 */
export function AnchoredFooter({ children, paddingBottom, testID }: AnchoredFooterProps) {
  return (
    <View
      className="flex-row gap-sm border-t border-white/10 bg-brand-blue-card-dark/70 px-md pt-md"
      // Inline style, NOT a `pb-[…]` arbitrary value: Tailwind compiles class names by scanning
      // source at build time, so a template literal holding a runtime number produces a class
      // that was never generated — the inset silently becomes 0 and the buttons sit against the
      // bottom edge of the screen. A safe-area inset has no Tailwind equivalent.
      style={{ paddingBottom }}
      testID={testID}
    >
      {children}
    </View>
  );
}
