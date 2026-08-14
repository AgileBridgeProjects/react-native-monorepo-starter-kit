import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

import { breakpoints } from '@/constants/breakpoints';

export interface Breakpoints {
  /** True when the viewport is narrower than the tablet breakpoint (< 768 px). */
  isMobile: boolean;
  /** True when the viewport is at least the tablet breakpoint (≥ 768 px). */
  isTablet: boolean;
  /** True when the viewport is at least the desktop breakpoint (≥ 1024 px). */
  isDesktop: boolean;
  /**
   * Responsive column count for grid layouts (e.g. FlatList numColumns).
   * 1 on mobile, 2 on tablet, 3 on desktop.
   * FlatList.numColumns is a JS prop with no Tailwind equivalent, so this
   * centralises the derivation rather than scattering it across screens.
   */
  numColumns: 1 | 2 | 3;
}

/** Returns responsive breakpoint booleans derived from the current window width. */
export function useBreakpoints(): Breakpoints {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    const isMobile = width < breakpoints.md;
    const isTablet = width >= breakpoints.md;
    const isDesktop = width >= breakpoints.lg;

    return {
      isMobile,
      isTablet,
      isDesktop,
      numColumns: isDesktop ? 3 : isTablet ? 2 : 1,
    };
  }, [width]);
}
