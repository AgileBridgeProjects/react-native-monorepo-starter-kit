import { Text, View } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { ModalSheet } from '@/components/ui/modal-sheet';
import { byTestId, firePress, renderTree, textChildren } from '@/test/utils/rtr';

vi.mock('@/components/ui/icon', () => ({
  Icon: ({ name }: { name: string }) => <View testID={`icon-${name}`} />,
}));

describe('ModalSheet', () => {
  it('renders nothing when not visible', () => {
    const renderer = renderTree(
      <ModalSheet
        visible={false}
        onClose={vi.fn()}
        title="Choose a due date"
        closeLabel="Cancel"
        testID="modal-sheet"
      >
        <Text>Body</Text>
      </ModalSheet>,
    );

    expect(renderer.toJSON()).toBeNull();
  });

  it('renders the title, subtitle, body, and footer when visible', () => {
    const renderer = renderTree(
      <ModalSheet
        visible
        onClose={vi.fn()}
        title="Choose a due date"
        subtitle="For the selected athletes"
        closeLabel="Cancel"
        testID="modal-sheet"
        footer={<Text>Apply</Text>}
      >
        <Text>Body content</Text>
      </ModalSheet>,
    );

    expect(byTestId(renderer.root, 'modal-sheet')).toBeTruthy();
    const text = textChildren(renderer.root);
    expect(text).toContain('Choose a due date');
    expect(text).toContain('For the selected athletes');
    expect(text).toContain('Body content');
    expect(text).toContain('Apply');
  });

  it('calls onClose when the close button is pressed', async () => {
    const onClose = vi.fn();
    const renderer = renderTree(
      <ModalSheet visible onClose={onClose} title="Choose a due date" closeLabel="Cancel">
        <Text>Body</Text>
      </ModalSheet>,
    );
    const closeButton = renderer.root.find(
      (n) =>
        n.type === 'Pressable' &&
        n.props.accessibilityRole === 'button' &&
        n.props.accessibilityLabel === 'Cancel',
    );

    await firePress(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is pressed', async () => {
    const onClose = vi.fn();
    const renderer = renderTree(
      <ModalSheet visible onClose={onClose} title="Choose a due date" closeLabel="Cancel">
        <Text>Body</Text>
      </ModalSheet>,
    );
    // The backdrop and the header close button share the same accessibilityLabel — the backdrop
    // is the one identifiable by its absolute-fill style instead.
    const backdrop = renderer.root.find(
      (n) => n.type === 'Pressable' && n.props.style?.position === 'absolute',
    );

    await firePress(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
