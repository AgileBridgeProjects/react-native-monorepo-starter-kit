import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { act } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Local reanimated mock with a working `interpolate` (the global setup mock omits
// it, so useAnimatedStyle would throw → {} and we couldn't read the height).
vi.mock('react-native-reanimated', async () => {
  const React = await import('react');
  return {
    // Stable shared-value object across renders (mirrors real reanimated), so
    // handler mutations to `.value` survive rerenders.
    useSharedValue: (initial: unknown) => React.useRef({ value: initial }).current,
    useAnimatedStyle: (fn: () => unknown) => {
      try {
        return fn();
      } catch {
        return {};
      }
    },
    withTiming: (value: unknown) => value,
    interpolate: (input: number, inputRange: number[], outputRange: number[]) => {
      // linear interpolation across the first/last range pair (enough for [0,1])
      const [inMin, inMax] = [inputRange[0], inputRange[inputRange.length - 1]];
      const [outMin, outMax] = [outputRange[0], outputRange[outputRange.length - 1]];
      if (inMax === inMin) return outMin;
      const t = (input - inMin) / (inMax - inMin);
      return outMin + t * (outMax - outMin);
    },
    Easing: {
      out: (fn: unknown) => fn,
      cubic: (t: number) => t,
    },
  };
});

import { useCollapsibleHeader } from '@lib/hooks/use-collapsible-header';
import { renderHook } from '@/test/utils/render-hook';

// ─── Event builders ─────────────────────────────────────────────────────────────

function layoutEvent(height: number): LayoutChangeEvent {
  return { nativeEvent: { layout: { height, width: 0, x: 0, y: 0 } } } as LayoutChangeEvent;
}

function scrollEvent(opts: {
  y: number;
  contentHeight?: number;
  layoutHeight?: number;
}): NativeSyntheticEvent<NativeScrollEvent> {
  return {
    nativeEvent: {
      contentOffset: { y: opts.y, x: 0 },
      contentSize: { height: opts.contentHeight ?? 2000, width: 0 },
      layoutMeasurement: { height: opts.layoutHeight ?? 800, width: 0 },
    },
  } as unknown as NativeSyntheticEvent<NativeScrollEvent>;
}

// The reanimated mock recomputes useAnimatedStyle on each render, and shared-value
// mutations don't trigger a React render — so we rerender to read the current style.
function containerHeight(style: unknown): number | undefined {
  return (style as { height?: number }).height;
}

let now = 0;

beforeEach(() => {
  now = 1_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => now);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useCollapsibleHeader', () => {
  it('exposes the expected handler surface and a 16ms scroll throttle', () => {
    const { result } = renderHook(() => useCollapsibleHeader());
    expect(typeof result.current.onScroll).toBe('function');
    expect(typeof result.current.onHeroLayout).toBe('function');
    expect(typeof result.current.onScrollBeginDrag).toBe('function');
    expect(result.current.scrollEventThrottle).toBe(16);
    expect(result.current.heroContainerStyle).toBeDefined();
    expect(result.current.heroAnimatedStyle).toBeDefined();
  });

  it('returns an empty container style before the hero is measured', () => {
    const { result } = renderHook(() => useCollapsibleHeader());
    expect(result.current.heroContainerStyle).toEqual({});
    expect(result.current.heroAnimatedStyle).toEqual({});
  });

  it('measures hero height once and ignores subsequent layout passes', () => {
    const { result, rerender } = renderHook(() => useCollapsibleHeader());

    act(() => {
      result.current.onHeroLayout(layoutEvent(240));
    });
    rerender();
    expect(containerHeight(result.current.heroContainerStyle)).toBe(240);

    act(() => {
      result.current.onHeroLayout(layoutEvent(999));
    });
    rerender();
    expect(containerHeight(result.current.heroContainerStyle)).toBe(240);
  });

  it('collapses when scrolling down past the threshold with enough scrollable content', () => {
    const { result, rerender } = renderHook(() => useCollapsibleHeader());

    act(() => {
      result.current.onHeroLayout(layoutEvent(200));
      result.current.onScroll(scrollEvent({ y: 0 })); // prime lastScrollY
    });
    now += 500; // clear cooldown
    act(() => {
      // y past COLLAPSE_THRESHOLD(80), dy>2, scrollable = 2000-800 = 1200 >= 300
      result.current.onScroll(scrollEvent({ y: 100 }));
    });
    rerender();

    expect(containerHeight(result.current.heroContainerStyle)).toBe(0);
    expect((result.current.heroAnimatedStyle as { opacity?: number }).opacity).toBe(0);
  });

  it('does NOT collapse when there is not enough scrollable content', () => {
    const { result, rerender } = renderHook(() => useCollapsibleHeader());

    act(() => {
      result.current.onHeroLayout(layoutEvent(200));
      result.current.onScroll(scrollEvent({ y: 0, contentHeight: 900, layoutHeight: 800 }));
    });
    now += 500;
    act(() => {
      // scrollable = 900-800 = 100 < MIN_SCROLLABLE_HEIGHT(300) → no collapse
      result.current.onScroll(scrollEvent({ y: 100, contentHeight: 900, layoutHeight: 800 }));
    });
    rerender();

    expect(containerHeight(result.current.heroContainerStyle)).toBe(200);
  });

  it('expands again on a deliberate upward scroll after collapsing', () => {
    const { result, rerender } = renderHook(() => useCollapsibleHeader());

    act(() => {
      result.current.onHeroLayout(layoutEvent(200));
      result.current.onScroll(scrollEvent({ y: 0 }));
    });
    now += 500;
    act(() => {
      result.current.onScroll(scrollEvent({ y: 100 })); // collapse
    });
    rerender();
    expect(containerHeight(result.current.heroContainerStyle)).toBe(0);

    now += 500; // clear cooldown
    act(() => {
      // dy = 60-100 = -40 < EXPAND_DELTA(-20) → expand
      result.current.onScroll(scrollEvent({ y: 60 }));
    });
    rerender();
    expect(containerHeight(result.current.heroContainerStyle)).toBe(200);
  });

  it('honours the cooldown — a second toggle within 400ms is ignored', () => {
    const { result, rerender } = renderHook(() => useCollapsibleHeader());

    act(() => {
      result.current.onHeroLayout(layoutEvent(200));
      result.current.onScroll(scrollEvent({ y: 0 }));
    });
    now += 500;
    act(() => {
      result.current.onScroll(scrollEvent({ y: 100 })); // collapse, sets lastToggle
    });
    rerender();
    expect(containerHeight(result.current.heroContainerStyle)).toBe(0);

    now += 100; // still within COOLDOWN_MS(400)
    act(() => {
      result.current.onScroll(scrollEvent({ y: 40 })); // would expand, but cooled down
    });
    rerender();
    expect(containerHeight(result.current.heroContainerStyle)).toBe(0);
  });

  it('composes an existing onScroll handler', () => {
    const existing = vi.fn();
    const { result } = renderHook(() => useCollapsibleHeader(existing));

    const event = scrollEvent({ y: 50 });
    act(() => {
      result.current.onScroll(event);
    });

    expect(existing).toHaveBeenCalledWith(event);
  });

  it('does not collapse on a small downward delta (dy <= 2)', () => {
    const { result, rerender } = renderHook(() => useCollapsibleHeader());

    act(() => {
      result.current.onHeroLayout(layoutEvent(200));
      result.current.onScroll(scrollEvent({ y: 0 })); // prime lastScrollY=0
    });
    now += 500;
    act(() => {
      // y=80 is NOT > COLLAPSE_THRESHOLD(80) (strict) → no collapse; lastScrollY=80
      result.current.onScroll(scrollEvent({ y: 80 }));
    });
    now += 500;
    act(() => {
      // dy = 81-80 = 1, not > 2 → no collapse despite y > threshold
      result.current.onScroll(scrollEvent({ y: 81 }));
    });
    rerender();

    expect(containerHeight(result.current.heroContainerStyle)).toBe(200);
  });
});
