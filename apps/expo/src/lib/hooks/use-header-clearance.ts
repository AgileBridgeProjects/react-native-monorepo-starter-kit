import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Matches the custom TabHeader row's rendered height (tabs use a taller
// greeting/title + bell + hamburger row than detail screens do) — already the
// proven Android Stack `height` for this exact row (see android-tab-screen.tsx).
const TAB_HEADER_HEIGHT = 76;
// Detail screens use a plain centered title + back button — shorter, no
// custom subtitle row. No exact native measurement is available without
// @react-navigation/elements, so this matches Android's own Material default
// toolbar height (56dp) as the closest available reference point.
const DETAIL_HEADER_HEIGHT = 56;

/**
 * Top padding a screen's content needs to clear its own transparent, floating
 * header (see (tabs)/(home)/_layout.ios.tsx and android-tab-screen.tsx for the
 * header side of this pattern) instead of rendering underneath it.
 *
 * `'none'` is for screens under an OPAQUE header — the native header already occupies
 * that space, so adding padding on top of it double-spaces the content. Detail screens
 * on the root stack are opaque (see detailScreenOptions in app/_layout.tsx: a
 * transparent header let content slide underneath, and iOS 26 washed it out with a
 * scroll-edge material).
 */
export function useHeaderClearance(variant: 'tab' | 'detail' | 'none'): number {
  const insets = useSafeAreaInsets();

  if (Platform.OS === 'web' || variant === 'none') return 0;
  return insets.top + (variant === 'tab' ? TAB_HEADER_HEIGHT : DETAIL_HEADER_HEIGHT);
}
