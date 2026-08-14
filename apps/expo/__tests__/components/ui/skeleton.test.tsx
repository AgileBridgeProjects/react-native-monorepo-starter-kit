import type React from 'react';
import { View } from 'react-native';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { Skeleton } from '@/components/ui/skeleton';

vi.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: { children?: React.ReactNode }) => (
    <View {...props}>{children}</View>
  ),
}));

vi.mock('react-native-reanimated', () => ({
  default: {
    createAnimatedComponent: (c: React.ComponentType) => c,
    View: View,
  },
  useSharedValue: (v: number) => ({ value: v }),
  useReducedMotion: () => false,
  useAnimatedStyle: (fn: () => object) => fn(),
  withRepeat: () => 0,
  withTiming: () => 0,
}));

function renderSkeleton(props: React.ComponentProps<typeof Skeleton>) {
  let renderer: ReturnType<typeof create> | undefined;

  act(() => {
    renderer = create(<Skeleton {...props} />);
  });

  if (!renderer) {
    throw new Error('Expected skeleton renderer to be created.');
  }

  return renderer;
}

describe('Skeleton', () => {
  it('renders with accessibility hidden from screen readers', () => {
    const renderer = renderSkeleton({ testID: 'skeleton' });
    const skeleton = renderer.root.findByType(View);

    expect(skeleton.props.accessibilityElementsHidden).toBeTruthy();
    expect(skeleton.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(skeleton.props.testID).toBe('skeleton');
  });

  it('applies shape and className variants', () => {
    const renderer = renderSkeleton({ shape: 'circle', className: 'h-10 w-10' });
    const skeleton = renderer.root.findByType(View);

    expect(skeleton.props.className).toContain('rounded-full');
    expect(skeleton.props.className).toContain('h-10');
    expect(skeleton.props.className).toContain('w-10');
  });
});
