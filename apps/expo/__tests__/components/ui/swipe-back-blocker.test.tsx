import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SwipeBackBlocker } from '@/components/ui/swipe-back-blocker';
import { renderTree } from '@/test/utils/rtr';

// react-native-gesture-handler is not aliased in the vitest config, so its native
// internals fail to parse. Provide a minimal chainable Pan builder + a host
// GestureDetector so the real component's gesture wiring is exercised.
const panBuilder = vi.hoisted(() => {
  const calls: { activeOffsetX?: number[]; onStart?: () => void } = {};
  const builder: Record<string, unknown> = {
    activeOffsetX: vi.fn((range: number[]) => {
      calls.activeOffsetX = range;
      return builder;
    }),
    onStart: vi.fn((fn: () => void) => {
      calls.onStart = fn;
      return builder;
    }),
  };
  return { builder, calls };
});

vi.mock('react-native-gesture-handler', async () => {
  const React = await import('react');
  return {
    Gesture: { Pan: () => panBuilder.builder },
    GestureDetector: ({ children, gesture }: { children?: React.ReactNode; gesture?: unknown }) =>
      React.createElement('GestureDetector', { gesture, testID: 'gesture-detector' }, children),
  };
});

describe('SwipeBackBlocker', () => {
  it('wraps children in a GestureDetector carrying the blocking pan gesture', () => {
    const { root } = renderTree(
      <SwipeBackBlocker>
        {React.createElement('View', { testID: 'blocked-content' })}
      </SwipeBackBlocker>,
    );
    const detector = root.find((n) => n.type === 'GestureDetector');
    expect(detector.props.gesture).toBe(panBuilder.builder);
    expect(root.findAll((n) => n.props.testID === 'blocked-content')).toHaveLength(1);
  });

  it('activates the pan only after 5px of horizontal movement either way', () => {
    renderTree(
      <SwipeBackBlocker>
        {React.createElement('View', { testID: 'blocked-content' })}
      </SwipeBackBlocker>,
    );
    expect(panBuilder.calls.activeOffsetX).toEqual([-5, 5]);
  });

  it('registers an onStart handler that consumes the gesture without throwing', () => {
    renderTree(
      <SwipeBackBlocker>
        {React.createElement('View', { testID: 'blocked-content' })}
      </SwipeBackBlocker>,
    );
    expect(typeof panBuilder.calls.onStart).toBe('function');
    expect(() => panBuilder.calls.onStart?.()).not.toThrow();
  });

  it('matches the snapshot', () => {
    const { toJSON } = renderTree(
      <SwipeBackBlocker>
        {React.createElement('View', { testID: 'blocked-content' })}
      </SwipeBackBlocker>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
