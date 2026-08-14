import { useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { act } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { FormField } from '@/components/ui/form-field';
import {
  fireChangeText,
  firePress,
  hostByTestId,
  inputByTestId,
  renderTree,
  textChildren,
} from '@/test/utils/rtr';

vi.mock('@/src/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/components/ui/icon', () => ({
  Icon: ({ name }: { name: string }) => <View testID={`icon-${name}`} />,
}));

interface Values {
  email: string;
}

/** Test host that wires FormField through a real react-hook-form control. */
function Harness({
  onSubmit,
  defaultValue = '',
  onReady,
}: {
  onSubmit?: (values: Values) => void;
  defaultValue?: string;
  onReady?: (api: ReturnType<typeof useForm<Values>>) => void;
}) {
  const form = useForm<Values>({ defaultValues: { email: defaultValue } });
  onReady?.(form);
  return (
    <>
      <FormField control={form.control} name="email" label="Email" testID="email" />
      <Pressable testID="submit" onPress={form.handleSubmit((v) => onSubmit?.(v))} />
    </>
  );
}

describe('FormField', () => {
  it('renders the wrapped Input with its label and the controlled value', () => {
    const renderer = renderTree(<Harness defaultValue="a@b.com" />);

    expect(textChildren(renderer.root)).toContain('Email');
    expect(inputByTestId(renderer.root, 'email').props.value).toBe('a@b.com');
    expect(renderer.toJSON()).toMatchSnapshot();
  });

  it('updates the controlled value when the field changes', async () => {
    let api: ReturnType<typeof useForm<Values>> | undefined;
    const renderer = renderTree(<Harness onReady={(a) => (api = a)} />);

    await fireChangeText(inputByTestId(renderer.root, 'email'), 'new@mail.com');

    expect(inputByTestId(renderer.root, 'email').props.value).toBe('new@mail.com');
    expect(api?.getValues('email')).toBe('new@mail.com');
  });

  it('surfaces a validation error from the controller state below the input', async () => {
    let api: ReturnType<typeof useForm<Values>> | undefined;
    const renderer = renderTree(<Harness onReady={(a) => (api = a)} />);

    await act(async () => {
      api?.setError('email', { type: 'required', message: 'Email is required' });
    });

    expect(textChildren(renderer.root)).toContain('Email is required');
    // The Input renders the error message with an alert role.
    const alert = renderer.root.find(
      (n) => typeof n.type === 'string' && n.props.accessibilityRole === 'alert',
    );
    expect(alert).toBeTruthy();
    expect(renderer.toJSON()).toMatchSnapshot();
  });

  it('submits the controlled payload through handleSubmit', async () => {
    const onSubmit = vi.fn();
    const renderer = renderTree(<Harness onSubmit={onSubmit} />);

    await fireChangeText(inputByTestId(renderer.root, 'email'), 'valid@mail.com');
    await firePress(hostByTestId(renderer.root, 'submit'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ email: 'valid@mail.com' });
  });

  it('has no error in the pristine state', () => {
    const renderer = renderTree(<Harness />);
    const alert = renderer.root.findAll(
      (n) => typeof n.type === 'string' && n.props.accessibilityRole === 'alert',
    );

    expect(alert).toHaveLength(0);
  });
});
