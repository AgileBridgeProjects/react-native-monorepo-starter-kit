import type React from 'react';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { InterstitialSplash } from '@/components/ui/interstitial-splash';

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('@/constants/tokens', () => ({
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48 },
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    testID,
    onPress,
  }: {
    children: React.ReactNode;
    testID?: string;
    onPress?: () => void;
  }) => (
    <button type="button" data-testid={testID} onClick={onPress}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/typography', () => ({
  Typography: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

describe('InterstitialSplash', () => {
  it('renders the emoji, heading and button label', () => {
    let renderer: ReturnType<typeof create> | undefined;

    act(() => {
      renderer = create(
        <InterstitialSplash
          emoji="🎉"
          heading="Game Complete!"
          buttonLabel="View results"
          onPress={vi.fn()}
        />,
      );
    });

    const json = renderer?.toJSON();
    const text = JSON.stringify(json);
    expect(text).toContain('🎉');
    expect(text).toContain('Game Complete!');
    expect(text).toContain('View results');
  });

  it('renders the subtitle when provided', () => {
    let renderer: ReturnType<typeof create> | undefined;

    act(() => {
      renderer = create(
        <InterstitialSplash
          emoji="💪"
          heading="Game Complete!"
          subtitle="Better luck next time."
          buttonLabel="View results"
          onPress={vi.fn()}
        />,
      );
    });

    const text = JSON.stringify(renderer?.toJSON());
    expect(text).toContain('Better luck next time.');
  });

  it('does not render subtitle when omitted', () => {
    let renderer: ReturnType<typeof create> | undefined;

    act(() => {
      renderer = create(
        <InterstitialSplash
          emoji="🎉"
          heading="Game Complete!"
          buttonLabel="View results"
          onPress={vi.fn()}
        />,
      );
    });

    const text = JSON.stringify(renderer?.toJSON());
    // No subtitle text should appear
    expect(text).not.toContain('Better luck next time.');
  });

  it('applies testID to the root container', () => {
    let renderer: ReturnType<typeof create> | undefined;

    act(() => {
      renderer = create(
        <InterstitialSplash
          emoji="🎉"
          heading="Game Complete!"
          buttonLabel="View results"
          onPress={vi.fn()}
          testID="splash-root"
        />,
      );
    });

    const root = renderer?.root.findAll(
      (node: { props: Record<string, unknown> }) => node.props.testID === 'splash-root',
    );
    expect(root?.length).toBeGreaterThan(0);
  });

  it('applies buttonTestID to the CTA button', () => {
    let renderer: ReturnType<typeof create> | undefined;

    act(() => {
      renderer = create(
        <InterstitialSplash
          emoji="🎉"
          heading="Game Complete!"
          buttonLabel="View results"
          onPress={vi.fn()}
          buttonTestID="splash-cta"
        />,
      );
    });

    const text = JSON.stringify(renderer?.toJSON());
    expect(text).toContain('splash-cta');
  });

  it('calls onPress when the CTA button is pressed', () => {
    const onPress = vi.fn();
    let renderer: ReturnType<typeof create> | undefined;

    act(() => {
      renderer = create(
        <InterstitialSplash
          emoji="🎉"
          heading="Game Complete!"
          buttonLabel="View results"
          onPress={onPress}
          buttonTestID="splash-cta"
        />,
      );
    });

    const button = renderer?.root.find(
      (node: { props: Record<string, unknown> }) => node.props.testID === 'splash-cta',
    );
    act(() => {
      button?.props.onPress?.();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
