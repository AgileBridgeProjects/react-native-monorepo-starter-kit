import { useBreakpoints } from '@lib/hooks/use-breakpoints';
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@/test/utils/render-hook';

// Controllable window width — overrides the global react-native mock so we can
// drive every breakpoint threshold (md=768, lg=1024 from constants/breakpoints).
const dimensions = vi.hoisted(() => ({ width: 375 }));

vi.mock('react-native', () => ({
  useWindowDimensions: () => ({ width: dimensions.width, height: 812, scale: 1, fontScale: 1 }),
}));

function breakpointsAt(width: number) {
  dimensions.width = width;
  return renderHook(() => useBreakpoints()).result.current;
}

describe('useBreakpoints', () => {
  describe('mobile (< 768px)', () => {
    it.each([320, 375, 767])('treats width %i as mobile with 1 column', (width) => {
      const bp = breakpointsAt(width);
      expect(bp.isMobile).toBeTruthy();
      expect(bp.isTablet).toBeFalsy();
      expect(bp.isDesktop).toBeFalsy();
      expect(bp.numColumns).toBe(1);
    });
  });

  describe('tablet (>= 768px, < 1024px)', () => {
    it.each([768, 900, 1023])('treats width %i as tablet with 2 columns', (width) => {
      const bp = breakpointsAt(width);
      expect(bp.isMobile).toBeFalsy();
      expect(bp.isTablet).toBeTruthy();
      expect(bp.isDesktop).toBeFalsy();
      expect(bp.numColumns).toBe(2);
    });
  });

  describe('desktop (>= 1024px)', () => {
    it.each([1024, 1440, 1920])('treats width %i as desktop with 3 columns', (width) => {
      const bp = breakpointsAt(width);
      expect(bp.isMobile).toBeFalsy();
      expect(bp.isTablet).toBeTruthy();
      expect(bp.isDesktop).toBeTruthy();
      expect(bp.numColumns).toBe(3);
    });
  });

  describe('boundary values', () => {
    it('md breakpoint (768) flips mobile→tablet (>= is tablet)', () => {
      expect(breakpointsAt(767).isMobile).toBeTruthy();
      expect(breakpointsAt(768).isTablet).toBeTruthy();
    });

    it('lg breakpoint (1024) flips tablet→desktop (>= is desktop)', () => {
      expect(breakpointsAt(1023).isDesktop).toBeFalsy();
      expect(breakpointsAt(1024).isDesktop).toBeTruthy();
    });
  });

  it('recomputes when the width changes across a rerender', () => {
    dimensions.width = 375;
    const { result, rerender } = renderHook(() => useBreakpoints());
    expect(result.current.numColumns).toBe(1);

    dimensions.width = 1200;
    rerender();
    expect(result.current.numColumns).toBe(3);
  });
});
