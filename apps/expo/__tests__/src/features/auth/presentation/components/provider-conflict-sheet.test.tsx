import { AUTH_TEST_IDS } from '@features/auth/presentation/auth.copy';
import { ProviderConflictSheet } from '@features/auth/presentation/components/provider-conflict-sheet';
import { ProviderConflictFailure } from '@starterkit/shared';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  byTestId,
  firePress,
  queryAllByTestId,
  renderTree,
  type TestNode,
  textChildren,
} from '@/test/utils/rtr';

vi.mock('@/src/lib/i18n', async () => (await import('@/test/mocks/shared')).i18nPassthrough());
vi.mock('@/components/ui', async () => (await import('@/test/mocks/ui')).makeUiMock());
// ActionSheet renders its children only when visible and exposes the close handler.
vi.mock('@/components/ui/action-sheet', () => ({
  ActionSheet: ({
    visible,
    onClose,
    children,
  }: {
    visible?: boolean;
    onClose?: () => void;
    children?: React.ReactNode;
  }) =>
    visible
      ? React.createElement(
          'View',
          { testID: AUTH_TEST_IDS.components.providerConflict.sheet, 'data-onclose': onClose },
          children,
        )
      : null,
}));

const onDismiss = vi.fn();
const render = (error: Error | null | undefined): TestNode =>
  renderTree(React.createElement(ProviderConflictSheet, { error, onDismiss })).root;

const SHEET = AUTH_TEST_IDS.components.providerConflict.sheet;
const DISMISS = AUTH_TEST_IDS.components.providerConflict.dismissButton;

beforeEach(() => vi.clearAllMocks());

describe('ProviderConflictSheet — snapshots', () => {
  it('matches the visible (conflict) tree', () => {
    expect(
      renderTree(
        React.createElement(ProviderConflictSheet, {
          error: new ProviderConflictFailure('a@b.com', 'Google'),
          onDismiss,
        }),
      ).toJSON(),
    ).toMatchSnapshot();
  });

  it('matches the hidden (no conflict) tree', () => {
    expect(
      renderTree(React.createElement(ProviderConflictSheet, { error: null, onDismiss })).toJSON(),
    ).toMatchSnapshot();
  });
});

describe('ProviderConflictSheet — visibility gating', () => {
  it('does not render for a null error', () => {
    expect(queryAllByTestId(render(null), SHEET)).toHaveLength(0);
  });

  it('does not render for a generic (non-conflict) error', () => {
    expect(queryAllByTestId(render(new Error('boom')), SHEET)).toHaveLength(0);
  });

  it('renders for a ProviderConflictFailure', () => {
    expect(byTestId(render(new ProviderConflictFailure('a@b.com', 'Google')), SHEET)).toBeTruthy();
  });
});

describe('ProviderConflictSheet — message branches', () => {
  it('uses the linked-provider message when an email and provider are known', () => {
    const root = render(new ProviderConflictFailure('user@x.com', 'Microsoft'));
    expect(textChildren(root)).toContain('providerConflict.title');
    expect(textChildren(root)).toContain('providerConflict.message');
  });

  it('uses the no-provider message for an orphaned account', () => {
    const root = render(new ProviderConflictFailure('user@x.com', 'Google', true));
    expect(textChildren(root)).toContain('providerConflict.messageNoProvider');
  });

  it('uses the no-email message when the email is unknown', () => {
    const root = render(new ProviderConflictFailure('unknown', 'Google'));
    expect(textChildren(root)).toContain('providerConflict.messageNoEmail');
  });
});

describe('ProviderConflictSheet — dismiss', () => {
  it('calls onDismiss when the dismiss button is pressed', async () => {
    await firePress(byTestId(render(new ProviderConflictFailure('a@b.com', 'Google')), DISMISS));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('wires the sheet onClose to the dismiss handler', async () => {
    const sheet = byTestId(render(new ProviderConflictFailure('a@b.com', 'Google')), SHEET);
    await act_onClose(sheet);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

async function act_onClose(sheet: TestNode) {
  const onClose = sheet.props['data-onclose'] as (() => void) | undefined;
  await Promise.resolve(onClose?.());
}
