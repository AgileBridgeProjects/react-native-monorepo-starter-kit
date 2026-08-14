import { AUTH_TEST_IDS } from '@features/auth/presentation/auth.copy';
import { PasswordRulesChecklist } from '@features/auth/presentation/components/password-rules-checklist';
import { PASSWORD_RULES } from '@starterkit/shared';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { hostByTestId, queryAllByTestId, renderTree, type TestNode } from '@/test/utils/rtr';

vi.mock('@starterkit/icons', () => ({
  CheckmarkIcon: () => React.createElement('View', { testID: 'icon-check' }),
  CloseIcon: () => React.createElement('View', { testID: 'icon-close' }),
}));
vi.mock('@/components/ui', async () => (await import('@/test/mocks/ui')).makeUiMock());
vi.mock('@/src/lib/cn', () => ({ cn: (...args: unknown[]) => args.filter(Boolean).join(' ') }));

const t = (key: string) => key;
const I18N_PREFIX = 'setup.rules';

const render = (password: string): TestNode =>
  renderTree(
    React.createElement(PasswordRulesChecklist, {
      password,
      translationFn: t,
      i18nPrefix: I18N_PREFIX,
    }),
  ).root;

const ruleId = (key: string) => AUTH_TEST_IDS.components.passwordRules.rule(key);

describe('PasswordRulesChecklist — snapshots', () => {
  it('matches the all-failing tree (single lowercase char)', () => {
    expect(
      renderTree(
        React.createElement(PasswordRulesChecklist, {
          password: 'a',
          translationFn: t,
          i18nPrefix: I18N_PREFIX,
        }),
      ).toJSON(),
    ).toMatchSnapshot();
  });

  it('matches the all-passing tree (valid complex password)', () => {
    expect(
      renderTree(
        React.createElement(PasswordRulesChecklist, {
          password: 'Passw0rd!',
          translationFn: t,
          i18nPrefix: I18N_PREFIX,
        }),
      ).toJSON(),
    ).toMatchSnapshot();
  });
});

describe('PasswordRulesChecklist — empty', () => {
  it('renders nothing for an empty password', () => {
    expect(
      renderTree(
        React.createElement(PasswordRulesChecklist, {
          password: '',
          translationFn: t,
          i18nPrefix: I18N_PREFIX,
        }),
      ).toJSON(),
    ).toBeNull();
  });
});

describe('PasswordRulesChecklist — populated', () => {
  it('renders one row per shared rule, labelled with the i18n prefix', () => {
    const root = render('a');
    for (const rule of PASSWORD_RULES) {
      expect(hostByTestId(root, ruleId(rule.key))).toBeTruthy();
    }
    expect(queryAllByTestId(root, ruleId('minLength'))).toHaveLength(1);
  });
});

describe('PasswordRulesChecklist — per-rule pass/fail', () => {
  // (password, met-rule-keys) — drives every rule through both states.
  const cases: Array<[string, string[]]> = [
    ['a', ['lowercase']],
    ['A', ['uppercase']],
    ['1', ['number']],
    ['!', ['special']],
    ['aaaaaa', ['minLength', 'lowercase']],
    ['Aa1!', ['uppercase', 'lowercase', 'number', 'special']],
    ['Passw0rd!', ['minLength', 'uppercase', 'lowercase', 'number', 'special']],
  ];

  for (const [password, metKeys] of cases) {
    it(`marks the correct rules met/unmet for "${password}"`, () => {
      const root = render(password);
      for (const rule of PASSWORD_RULES) {
        const met = metKeys.includes(rule.key);
        const row = hostByTestId(root, ruleId(rule.key));
        expect(row.props.accessibilityState.checked).toBe(met);
        // The matching icon renders for the state.
        expect(queryAllByTestId(row, met ? 'icon-check' : 'icon-close')).toHaveLength(1);
        expect(queryAllByTestId(row, met ? 'icon-close' : 'icon-check')).toHaveLength(0);
      }
    });
  }

  it('exposes a screen-reader label combining the rule text and met/notMet', () => {
    const root = render('Passw0rd!');
    const label = hostByTestId(root, ruleId('minLength')).props.accessibilityLabel as string;
    expect(label).toContain('setup.rules.minLength');
    expect(label).toContain('common:met');
  });

  it('uses the notMet label when a rule fails', () => {
    const root = render('a');
    expect(hostByTestId(root, ruleId('uppercase')).props.accessibilityLabel).toContain(
      'common:notMet',
    );
  });
});
