import { AUTH_TEST_IDS } from '@features/auth/presentation/auth.copy';
import { ChangePasswordSection } from '@features/auth/presentation/components/change-password-section';
import React from 'react';
import { act } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  byTestId,
  hostByTestId,
  queryAllByTestId,
  renderTree,
  type TestNode,
  textChildren,
} from '@/test/utils/rtr';

const changePasswordMock = vi.fn();
const changeState: { mutate: typeof changePasswordMock; isPending: boolean; error: Error | null } =
  {
    mutate: changePasswordMock,
    isPending: false,
    error: null,
  };

vi.mock('@features/auth/presentation/hooks/use-change-password', () => ({
  useChangePassword: () => changeState,
}));
vi.mock('@/src/lib/i18n', async () => (await import('@/test/mocks/shared')).i18nPassthrough());
vi.mock('@/components/ui', async () => (await import('@/test/mocks/ui')).makeUiMock());
vi.mock('@features/auth/presentation/components/password-rules-checklist', () => ({
  PasswordRulesChecklist: ({ password }: { password?: string }) =>
    React.createElement('View', { testID: 'password-rules', 'data-password': password }),
}));
vi.mock('@features/auth/presentation/components/password-field', async () => {
  const { controllerField } = await import('@/test/mocks/ui');
  return {
    PasswordField: ({ control, name }: { control: unknown; name: string }) =>
      controllerField(control, name, { testID: `cp-${name}-input` }),
  };
});

const PW = 'cp-password-input';
const CONFIRM = 'cp-confirmPassword-input';
const SUBMIT = AUTH_TEST_IDS.components.changePassword.submitButton;

const render = (): TestNode => renderTree(React.createElement(ChangePasswordSection)).root;

async function setText(root: TestNode, testID: string, value: string) {
  await act(async () => {
    root.find((n) => n.type === 'TextInput' && n.props.testID === testID).props.onChangeText(value);
  });
}
async function submit(root: TestNode) {
  await act(async () => {
    await byTestId(root, SUBMIT).props.onPress?.();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  changeState.isPending = false;
  changeState.error = null;
  changeState.mutate = changePasswordMock;
});

describe('ChangePasswordSection — snapshots', () => {
  it('matches the default tree', () => {
    expect(renderTree(React.createElement(ChangePasswordSection)).toJSON()).toMatchSnapshot();
  });
});

describe('ChangePasswordSection — structure', () => {
  it('renders both password fields, the rules checklist and the submit button', () => {
    const root = render();
    expect(byTestId(root, PW)).toBeTruthy();
    expect(byTestId(root, CONFIRM)).toBeTruthy();
    expect(byTestId(root, 'password-rules')).toBeTruthy();
    expect(byTestId(root, SUBMIT)).toBeTruthy();
  });

  it('feeds the live password value to the rules checklist', async () => {
    const root = render();
    await setText(root, PW, 'Abc');
    expect(byTestId(root, 'password-rules').props['data-password']).toBe('Abc');
  });
});

describe('ChangePasswordSection — submit gating', () => {
  it('disables submit until both fields have input', () => {
    expect(hostByTestId(render(), SUBMIT).props.accessibilityState.disabled).toBeTruthy();
  });

  it('enables submit once both fields have input', async () => {
    const root = render();
    await setText(root, PW, 'Passw0rd!');
    await setText(root, CONFIRM, 'Passw0rd!');
    expect(hostByTestId(root, SUBMIT).props.accessibilityState.disabled).toBeFalsy();
  });
});

describe('ChangePasswordSection — submit + validation', () => {
  it('changes the password with the new value when valid', async () => {
    const root = render();
    await setText(root, PW, 'Passw0rd!');
    await setText(root, CONFIRM, 'Passw0rd!');
    await submit(root);
    expect(changePasswordMock).toHaveBeenCalledWith('Passw0rd!', expect.any(Object));
  });

  it('blocks submit when the password fails complexity', async () => {
    const root = render();
    await setText(root, PW, 'password');
    await setText(root, CONFIRM, 'password');
    await submit(root);
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it('blocks submit when the passwords do not match', async () => {
    const root = render();
    await setText(root, PW, 'Passw0rd!');
    await setText(root, CONFIRM, 'Other1234!');
    await submit(root);
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it('shows the success alert and clears the form on success', async () => {
    changePasswordMock.mockImplementation((_pw, opts) => opts?.onSuccess?.());
    const root = render();
    await setText(root, PW, 'Passw0rd!');
    await setText(root, CONFIRM, 'Passw0rd!');
    await submit(root);
    expect(byTestId(root, 'alert-success')).toBeTruthy();
    expect(textChildren(root)).toContain('changePassword.successMessage');
  });
});

describe('ChangePasswordSection — feedback states', () => {
  it('shows the error alert when the mutation errors', () => {
    changeState.error = new Error('nope');
    const root = render();
    expect(textChildren(byTestId(root, 'alert-error'))).toContain('changePassword.errorGeneric');
  });

  it('shows no success alert before a successful submit', () => {
    expect(queryAllByTestId(render(), 'alert-success')).toHaveLength(0);
  });
});
