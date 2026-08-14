import { describe, expect, it, vi } from 'vitest';

import { PhoneInput } from '@/components/ui/phone-input';
import { fireChangeText, inputByTestId, renderTree, textChildren } from '@/test/utils/rtr';

function baseProps(overrides: Partial<React.ComponentProps<typeof PhoneInput>> = {}) {
  return {
    value: '',
    onChangeText: vi.fn(),
    testID: 'phone',
    ...overrides,
  };
}

describe('PhoneInput', () => {
  it('renders the fixed +27 country-code prefix and the editable field', () => {
    const renderer = renderTree(<PhoneInput {...baseProps({ value: '821234567' })} />);

    expect(textChildren(renderer.root)).toContain('+27');
    const input = inputByTestId(renderer.root, 'phone');
    expect(input.props.value).toBe('821234567');
    expect(input.props.keyboardType).toBe('phone-pad');
    expect(input.props.autoCorrect).toBeFalsy();
    expect(renderer.toJSON()).toMatchSnapshot();
  });

  it('renders the optional label above the input', () => {
    const renderer = renderTree(<PhoneInput {...baseProps({ label: 'Phone number' })} />);

    expect(textChildren(renderer.root)).toContain('Phone number');
  });

  it('forwards the placeholder', () => {
    const renderer = renderTree(<PhoneInput {...baseProps({ placeholder: 'Enter number' })} />);

    expect(inputByTestId(renderer.root, 'phone').props.placeholder).toBe('Enter number');
  });

  it('calls onChangeText with the typed local number', async () => {
    const onChangeText = vi.fn();
    const renderer = renderTree(<PhoneInput {...baseProps({ onChangeText })} />);

    await fireChangeText(inputByTestId(renderer.root, 'phone'), '821234567');

    expect(onChangeText).toHaveBeenCalledWith('821234567');
  });

  it('calls onBlur when the field blurs', () => {
    const onBlur = vi.fn();
    const renderer = renderTree(<PhoneInput {...baseProps({ onBlur })} />);

    inputByTestId(renderer.root, 'phone').props.onBlur();

    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('shows no error border and no error message in the valid state', () => {
    const renderer = renderTree(<PhoneInput {...baseProps()} />);
    const wrapper = renderer.root.find(
      (n) =>
        typeof n.type === 'string' &&
        typeof n.props.className === 'string' &&
        n.props.className.includes('flex-row') &&
        n.props.className.includes('border'),
    );

    expect(wrapper.props.className).toContain('border-border');
    expect(wrapper.props.className).not.toContain('border-error');
    expect(textChildren(renderer.root)).not.toContainEqual(expect.stringContaining('Invalid'));
  });

  it('highlights the border red when error is true', () => {
    const renderer = renderTree(<PhoneInput {...baseProps({ error: true })} />);
    const wrapper = renderer.root.find(
      (n) =>
        typeof n.type === 'string' &&
        typeof n.props.className === 'string' &&
        n.props.className.includes('flex-row') &&
        n.props.className.includes('border'),
    );

    expect(wrapper.props.className).toContain('border-error');
  });

  it('renders the error message with an alert role and red border', () => {
    const renderer = renderTree(
      <PhoneInput {...baseProps({ errorMessage: 'Invalid phone number' })} />,
    );

    expect(textChildren(renderer.root)).toContain('Invalid phone number');
    const alert = renderer.root.find(
      (n) => typeof n.type === 'string' && n.props.accessibilityRole === 'alert',
    );
    expect(alert).toBeTruthy();

    const wrapper = renderer.root.find(
      (n) =>
        typeof n.type === 'string' &&
        typeof n.props.className === 'string' &&
        n.props.className.includes('flex-row') &&
        n.props.className.includes('border'),
    );
    expect(wrapper.props.className).toContain('border-error');
    expect(renderer.toJSON()).toMatchSnapshot();
  });
});
