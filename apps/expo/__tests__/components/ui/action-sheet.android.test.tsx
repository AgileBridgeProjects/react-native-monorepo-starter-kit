import type React from 'react';
import { View } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { ActionSheet } from '@/components/ui/action-sheet.android';
import { hostByTestId, queryAllByTestId, renderTree } from '@/test/utils/rtr';

// @expo/ui/jetpack-compose is a native module — stub ModalBottomSheet to a host
// element exposing the dismiss-request wiring.
vi.mock('@expo/ui/jetpack-compose', () => ({
  ModalBottomSheet: ({
    children,
    onDismissRequest,
    properties,
  }: {
    children: React.ReactNode;
    onDismissRequest: () => void;
    skipPartiallyExpanded?: boolean;
    showDragHandle?: boolean;
    properties?: Record<string, boolean>;
  }) => (
    <View
      testID="compose-modal-sheet"
      onTouchEnd={onDismissRequest}
      accessibilityState={{ checked: properties?.shouldDismissOnClickOutside }}
    >
      {children}
    </View>
  ),
}));

describe('ActionSheet (Android)', () => {
  it('renders nothing when not visible', () => {
    const renderer = renderTree(
      <ActionSheet visible={false} onClose={vi.fn()}>
        <View testID="sheet-body" />
      </ActionSheet>,
    );

    expect(renderer.toJSON()).toBeNull();
  });

  it('renders the modal bottom sheet with children when visible', () => {
    const renderer = renderTree(
      <ActionSheet visible onClose={vi.fn()}>
        <View testID="sheet-body" />
      </ActionSheet>,
    );

    const sheet = hostByTestId(renderer.root, 'compose-modal-sheet');
    expect(sheet.props.accessibilityState.checked).toBeTruthy();
    expect(queryAllByTestId(renderer.root, 'sheet-body')).toHaveLength(1);
    expect(renderer.toJSON()).toMatchSnapshot();
  });

  it('calls onClose when the sheet requests dismissal', () => {
    const onClose = vi.fn();
    const renderer = renderTree(
      <ActionSheet visible onClose={onClose}>
        <View testID="sheet-body" />
      </ActionSheet>,
    );
    const sheet = hostByTestId(renderer.root, 'compose-modal-sheet');

    sheet.props.onTouchEnd();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
