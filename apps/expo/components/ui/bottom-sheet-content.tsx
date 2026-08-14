import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { Typography } from '@/components/ui/typography';
import { iconSize, palette } from '@/constants/tokens';

/**
 * Fraction of the window height a scrollable `children` body may grow to before it must
 * scroll instead of continuing to hug — see the class doc below for why this exists. One home
 * so every sheet body caps at the same fraction rather than each guessing its own.
 */
export const BOTTOM_SHEET_BODY_MAX_HEIGHT_RATIO = 0.6;

export interface BottomSheetContentProps {
  /** Sheet heading, rendered beside the close control. */
  title: string;
  /** Optional second line under the title — context for what is being resolved. */
  subtitle?: string;
  /** Accessible name for the close control. */
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  /** Pinned below the body, separated by a hairline (e.g. a primary CTA). */
  footer?: ReactNode;
  /**
   * Extra bottom padding under the footer. Leave at 0 on iOS — `fitToContents` already accounts
   * for the home indicator, and adding our own on top double-pads it.
   */
  insetBottom?: number;
  testID?: string;
}

/**
 * The chrome shared by every bottom sheet — header, body slot, footer — so the three platform
 * shells hold only their platform's presentation. Same split as
 * `country-picker-sheet-content.tsx`.
 *
 * No grabber, no backdrop and NO BACKGROUND here: the native sheet owns all three. Painting a
 * background from inside could never look right — `fitToContents` adds its own bottom inset,
 * and that strip is the native sheet's surface, so our colour stopped short of it and left a
 * visible seam. The platform's own material fills it instead, which is also what makes it read
 * as a real sheet rather than a navy panel.
 *
 * Each platform shell supplies the surface if it needs to: iOS lets the system material show,
 * Android wraps this in a surface colour because Compose's default would otherwise leave white
 * text on a light sheet.
 *
 * `children` gets no height constraint here — a hug-to-content sheet has none of its own either,
 * so a long list or a form with an expanded date picker just grows past the screen edge, taking
 * the header (title + close button) with it off the top. Capping that is on
 * each `children` body to do itself, with a Tailwind `max-h-[Npx]` arbitrary value (see
 * `BOTTOM_SHEET_BODY_MAX_HEIGHT_RATIO`) directly on its own scrollable element
 * (FlatList/ScrollView) — not a `flex-1` inside a bounding wrapper here, since a `flex-1` child
 * of an otherwise hug-sized ancestor measures to zero under `fitToContents` (confirmed
 * empirically: that's what caused the identity split in the first place). The `max-h` cap sidesteps that
 * entirely — it doesn't depend on flex resolution, just bounds the element's own frame and lets
 * its native scroll implementation take over from there.
 */
export function BottomSheetContent({
  title,
  subtitle,
  closeLabel,
  onClose,
  children,
  footer,
  insetBottom = 0,
  testID,
}: BottomSheetContentProps) {
  // Decided here rather than inline in the JSX (docs/standards/frontend.md § Conditional
  // rendering). Both branches clear the home indicator: WITH a footer the padding goes on the
  // footer so the separator sits above it; without one, a bare spacer does the job. Inline
  // styles because the inset is a runtime value.
  const footerArea = footer ? (
    <View className="border-t border-white/10 px-lg pt-md" style={{ paddingBottom: insetBottom }}>
      {footer}
    </View>
  ) : (
    <View style={{ height: insetBottom }} />
  );

  return (
    <View testID={testID}>
      <View className="flex-row items-start justify-between gap-md px-lg pb-md pt-md">
        <View className="flex-1 gap-xs">
          <Typography variant="h3" className="text-white">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body-sm" className="text-white/60">
              {subtitle}
            </Typography>
          )}
        </View>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          className="touch-target -mr-xs -mt-xs items-center justify-center"
        >
          <Icon name="xmark" size={iconSize.sm} color={palette.white[60]} />
        </Pressable>
      </View>

      {children}

      {footerArea}
    </View>
  );
}
