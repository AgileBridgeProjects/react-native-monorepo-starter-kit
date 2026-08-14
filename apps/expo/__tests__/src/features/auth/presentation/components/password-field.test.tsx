import { PasswordField } from '@features/auth/presentation/components/password-field';
import React from 'react';
import { useForm } from 'react-hook-form';
import { act } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { fireChangeText, renderTree, type TestNode } from '@/test/utils/rtr';

// Render the real `Input` as a host TextInput that surfaces label/error/secureTextEntry.
vi.mock('@/components/ui', () => ({
  Input: ({
    label,
    placeholder,
    value,
    onChangeText,
    onBlur,
    error,
    secureTextEntry,
  }: Record<string, unknown>) =>
    React.createElement('TextInput', {
      testID: 'pw-input',
      'data-label': label,
      placeholder,
      value,
      onChangeText,
      onBlur,
      'data-error': error,
      secureTextEntry,
    }),
}));

type Values = { password: string };

/** Host harness: drives a real react-hook-form control into the field. */
function Harness({
  defaultValue = '',
  onReady,
}: {
  defaultValue?: string;
  onReady?: (api: ReturnType<typeof useForm<Values>>) => void;
}) {
  const form = useForm<Values>({ defaultValues: { password: defaultValue } });
  onReady?.(form);
  return React.createElement(PasswordField<Values>, {
    control: form.control,
    name: 'password',
    label: 'Password',
    placeholder: 'Enter password',
  });
}

const renderField = (defaultValue = ''): TestNode =>
  renderTree(React.createElement(Harness, { defaultValue })).root;

const input = (root: TestNode) => root.find((n) => n.props.testID === 'pw-input');

describe('PasswordField — snapshots', () => {
  it('matches the default tree', () => {
    expect(renderTree(React.createElement(Harness, {})).toJSON()).toMatchSnapshot();
  });
});

describe('PasswordField', () => {
  it('renders the label and placeholder and masks input', () => {
    const node = input(renderField());
    expect(node.props['data-label']).toBe('Password');
    expect(node.props.placeholder).toBe('Enter password');
    expect(node.props.secureTextEntry).toBeTruthy();
  });

  it('reflects the controlled value', () => {
    expect(input(renderField('hunter2')).props.value).toBe('hunter2');
  });

  it('writes typed text back through the controller', async () => {
    let api: ReturnType<typeof useForm<Values>> | undefined;
    const root = renderTree(React.createElement(Harness, { onReady: (a) => (api = a) })).root;
    await fireChangeText(input(root), 'newpass');
    expect(api?.getValues('password')).toBe('newpass');
  });

  it('surfaces the field error message from the controller state', async () => {
    let api: ReturnType<typeof useForm<Values>> | undefined;
    const root = renderTree(React.createElement(Harness, { onReady: (a) => (api = a) })).root;
    await act(async () => {
      api?.setError('password', { type: 'manual', message: 'Too weak' });
    });
    expect(input(root).props['data-error']).toBe('Too weak');
  });

  it('has no error in the pristine state', () => {
    expect(input(renderField()).props['data-error']).toBeUndefined();
  });
});
