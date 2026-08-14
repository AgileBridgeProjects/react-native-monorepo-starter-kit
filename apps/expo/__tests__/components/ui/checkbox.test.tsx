import { View } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { Checkbox, CheckboxIndicator } from '@/components/ui/checkbox';
import { firePress, hostByTestId, queryAllByTestId, renderTree } from '@/test/utils/rtr';

vi.mock('@/components/ui/icon', () => ({
  Icon: ({ name }: { name: string }) => <View testID={`icon-${name}`} />,
}));

describe('Checkbox', () => {
  it('reflects the unchecked state for accessibility and hides the checkmark', () => {
    const renderer = renderTree(
      <Checkbox checked={false} onValueChange={vi.fn()} accessibilityLabel="Morning" testID="cb" />,
    );
    const host = hostByTestId(renderer.root, 'cb');

    expect(host.props.accessibilityState.checked).toBe(false);
    expect(queryAllByTestId(renderer.root, 'icon-checkmark')).toHaveLength(0);
  });

  it('reflects the checked state for accessibility and shows the checkmark', () => {
    const renderer = renderTree(
      <Checkbox checked onValueChange={vi.fn()} accessibilityLabel="Morning" testID="cb" />,
    );
    const host = hostByTestId(renderer.root, 'cb');

    expect(host.props.accessibilityState.checked).toBe(true);
    expect(queryAllByTestId(renderer.root, 'icon-checkmark')).toHaveLength(1);
  });

  it('calls onValueChange with the flipped value when pressed', async () => {
    const onValueChange = vi.fn();
    const renderer = renderTree(
      <Checkbox
        checked={false}
        onValueChange={onValueChange}
        accessibilityLabel="Morning"
        testID="cb"
      />,
    );

    await firePress(hostByTestId(renderer.root, 'cb'));

    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('does not fire onValueChange when disabled', async () => {
    const onValueChange = vi.fn();
    const renderer = renderTree(
      <Checkbox
        checked={false}
        onValueChange={onValueChange}
        disabled
        accessibilityLabel="Morning"
        testID="cb"
      />,
    );

    await firePress(hostByTestId(renderer.root, 'cb'));

    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe('CheckboxIndicator', () => {
  it('uses accent/white colors for the wizard variant', () => {
    const renderer = renderTree(<CheckboxIndicator checked variant="wizard" />);

    expect(renderer.toJSON()).toMatchSnapshot();
  });

  it('uses primary/border colors for the default variant', () => {
    const renderer = renderTree(<CheckboxIndicator checked variant="default" />);

    expect(renderer.toJSON()).toMatchSnapshot();
  });
});
