import type React from 'react';
import { View } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { ActionSheet } from '@/components/ui/action-sheet.ios';
import { hostByTestId, queryAllByTestId, renderTree } from '@/test/utils/rtr';

// @expo/ui/swift-ui is a native module — stub Host + BottomSheet to host elements
// that expose the presented/dismiss wiring for assertion.
vi.mock('@expo/ui/swift-ui', () => ({
  Host: ({ children }: { children: React.ReactNode }) => (
    <View testID="swift-host">{children}</View>
  ),
  BottomSheet: ({
    children,
    isPresented,
    onIsPresentedChange,
  }: {
    children: React.ReactNode;
    isPresented: boolean;
    onIsPresentedChange: (presented: boolean) => void;
    fitToContents?: boolean;
  }) => (
    <View
      testID="swift-bottom-sheet"
      accessibilityState={{ expanded: isPresented }}
      onMagicTap={() => onIsPresentedChange(false)}
      onAccessibilityEscape={() => onIsPresentedChange(true)}
    >
      {children}
    </View>
  ),
}));

describe('ActionSheet (iOS)', () => {
  it('renders nothing when not visible', () => {
    const renderer = renderTree(
      <ActionSheet visible={false} onClose={vi.fn()}>
        <View testID="sheet-body" />
      </ActionSheet>,
    );

    expect(renderer.toJSON()).toBeNull();
  });

  it('renders the native bottom sheet with children when visible', () => {
    const renderer = renderTree(
      <ActionSheet visible onClose={vi.fn()}>
        <View testID="sheet-body" />
      </ActionSheet>,
    );

    const sheet = hostByTestId(renderer.root, 'swift-bottom-sheet');
    expect(sheet.props.accessibilityState.expanded).toBeTruthy();
    expect(queryAllByTestId(renderer.root, 'sheet-body')).toHaveLength(1);
    expect(renderer.toJSON()).toMatchSnapshot();
  });

  it('calls onClose when the sheet reports a dismissal', () => {
    const onClose = vi.fn();
    const renderer = renderTree(
      <ActionSheet visible onClose={onClose}>
        <View testID="sheet-body" />
      </ActionSheet>,
    );
    const sheet = hostByTestId(renderer.root, 'swift-bottom-sheet');

    // onMagicTap → reports dismissal (presented=false).
    sheet.props.onMagicTap();
    // onAccessibilityEscape → reports still-presented (true), must not close.
    sheet.props.onAccessibilityEscape();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
