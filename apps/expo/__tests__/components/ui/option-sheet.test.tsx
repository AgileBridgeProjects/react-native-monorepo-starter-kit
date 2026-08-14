import { View } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { OptionSheet } from '@/components/ui/option-sheet';
import { byTestId, firePress, renderTree, textChildren } from '@/test/utils/rtr';

vi.mock('@/components/ui/icon', () => ({
  Icon: ({ name }: { name: string }) => <View testID={`icon-${name}`} />,
}));

const options = [
  { value: '', label: 'All Teams' },
  { value: 'team-1', label: 'General' },
  { value: 'team-2', label: 'Varsity' },
];

describe('OptionSheet', () => {
  it('renders nothing when not visible', () => {
    const renderer = renderTree(
      <OptionSheet
        visible={false}
        onClose={vi.fn()}
        title="Choose a team"
        closeLabel="Close"
        options={options}
        selectedValue="team-1"
        onSelect={vi.fn()}
        bodyMaxHeight={400}
        testID="option-sheet"
      />,
    );

    expect(renderer.toJSON()).toBeNull();
  });

  it('renders the title and every option when visible', () => {
    const renderer = renderTree(
      <OptionSheet
        visible
        onClose={vi.fn()}
        title="Choose a team"
        closeLabel="Close"
        options={options}
        selectedValue="team-1"
        onSelect={vi.fn()}
        bodyMaxHeight={400}
        testID="option-sheet"
      />,
    );

    expect(byTestId(renderer.root, 'option-sheet')).toBeTruthy();
    const text = textChildren(renderer.root);
    expect(text).toContain('Choose a team');
    expect(text).toContain('All Teams');
    expect(text).toContain('General');
    expect(text).toContain('Varsity');
  });

  it('marks the selected option with a checkmark and no others', () => {
    const renderer = renderTree(
      <OptionSheet
        visible
        onClose={vi.fn()}
        title="Choose a team"
        closeLabel="Close"
        options={options}
        selectedValue="team-1"
        onSelect={vi.fn()}
        bodyMaxHeight={400}
        optionTestID={(value) => `option-${value || 'all'}`}
      />,
    );

    const selectedOption = byTestId(renderer.root, 'option-team-1');
    const unselectedOption = byTestId(renderer.root, 'option-all');

    expect(selectedOption.findAll((n) => n.props.testID === 'icon-checkmark')).toHaveLength(1);
    expect(unselectedOption.findAll((n) => n.props.testID === 'icon-checkmark')).toHaveLength(0);
  });

  it('calls onSelect with the tapped option value', async () => {
    const onSelect = vi.fn();
    const renderer = renderTree(
      <OptionSheet
        visible
        onClose={vi.fn()}
        title="Choose a team"
        closeLabel="Close"
        options={options}
        selectedValue="team-1"
        onSelect={onSelect}
        bodyMaxHeight={400}
        optionTestID={(value) => `option-${value || 'all'}`}
      />,
    );

    await firePress(byTestId(renderer.root, 'option-team-2'));

    expect(onSelect).toHaveBeenCalledWith('team-2');
  });

  it('calls onClose when the close button is pressed', async () => {
    const onClose = vi.fn();
    const renderer = renderTree(
      <OptionSheet
        visible
        onClose={onClose}
        title="Choose a team"
        closeLabel="Close"
        options={options}
        selectedValue="team-1"
        onSelect={vi.fn()}
        bodyMaxHeight={400}
      />,
    );
    const closeButton = renderer.root.find(
      (n) =>
        n.type === 'Pressable' &&
        n.props.accessibilityRole === 'button' &&
        n.props.accessibilityLabel === 'Close',
    );

    await firePress(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
