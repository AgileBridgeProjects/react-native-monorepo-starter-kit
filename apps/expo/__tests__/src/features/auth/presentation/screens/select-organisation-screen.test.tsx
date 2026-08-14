import { AUTH_TEST_IDS } from '@features/auth/presentation/auth.copy';
import { SelectOrganisationScreen } from '@features/auth/presentation/screens/select-organisation-screen';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeLinkedOrg } from '@/test/factories';
import {
  byTestId,
  firePress,
  queryAllByTestId,
  renderTree,
  type TestNode,
  textChildren,
} from '@/test/utils/rtr';

// ─── Controllable state ────────────────────────────────────────────────────────
const replaceMock = vi.fn();
const switchOrgMock = vi.fn();
const refetchMock = vi.fn();
const orgsState: {
  data: ReturnType<typeof makeLinkedOrg>[] | undefined;
  isLoading: boolean;
  isError: boolean;
} = { data: undefined, isLoading: false, isError: false };

vi.mock('expo-router', () => ({
  useRouter: () => ({ replace: replaceMock }),
}));
vi.mock('@features/auth/presentation/hooks/use-organisations', () => ({
  useOrganisations: () => ({ ...orgsState, refetch: refetchMock }),
  useOrgSwitch: () => switchOrgMock,
}));
vi.mock('@lib/i18n', async () => (await import('@/test/mocks/shared')).i18nPassthrough());
vi.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));
vi.mock('@/components/ui', async () => (await import('@/test/mocks/ui')).makeUiMock());
vi.mock('@features/auth/presentation/components/org-list-skeleton', () => ({
  OrgListSkeleton: () => React.createElement('View', { testID: 'org-list-skeleton' }),
}));
vi.mock('@features/auth/presentation/components/select-org-header', () => ({
  SelectOrgHeader: () => React.createElement('View', { testID: 'select-org-header' }),
}));
vi.mock('@features/auth/presentation/components/org-card', () => ({
  OrgCard: ({
    org,
    onPress,
    accessibilityLabel,
  }: {
    org: { clubId: string; clubName: string };
    onPress: () => void;
    accessibilityLabel?: string;
  }) =>
    React.createElement(
      'Pressable',
      { testID: AUTH_TEST_IDS.selectOrg.orgItem(org.clubId), onPress, accessibilityLabel },
      React.createElement('Text', null, org.clubName),
    ),
}));

const render = (): TestNode => renderTree(React.createElement(SelectOrganisationScreen)).root;
const orgA = makeLinkedOrg({ clubId: 'c1', clubName: 'Acme Corp' });
const orgB = makeLinkedOrg({ clubId: 'c2', clubName: 'Globex' });

beforeEach(() => {
  vi.clearAllMocks();
  orgsState.data = [orgA, orgB];
  orgsState.isLoading = false;
  orgsState.isError = false;
});

// ════════════════════════════════════════════════════════════════════════════════
describe('SelectOrganisationScreen — snapshots', () => {
  it('matches the populated tree', () => {
    expect(renderTree(React.createElement(SelectOrganisationScreen)).toJSON()).toMatchSnapshot();
  });
});

describe('SelectOrganisationScreen — populated', () => {
  it('renders the screen container and the org-list header', () => {
    const root = render();
    expect(byTestId(root, AUTH_TEST_IDS.selectOrg.screen)).toBeTruthy();
    expect(byTestId(root, 'select-org-header')).toBeTruthy();
  });

  it('renders one card per linked organisation', () => {
    const root = render();
    expect(byTestId(root, AUTH_TEST_IDS.selectOrg.orgItem('c1'))).toBeTruthy();
    expect(byTestId(root, AUTH_TEST_IDS.selectOrg.orgItem('c2'))).toBeTruthy();
    const text = textChildren(root);
    expect(text).toContain('Acme Corp');
    expect(text).toContain('Globex');
  });

  it('switches org then navigates home when a card is pressed', async () => {
    const root = render();
    await firePress(byTestId(root, AUTH_TEST_IDS.selectOrg.orgItem('c2')));
    expect(switchOrgMock).toHaveBeenCalledWith('c2');
    expect(replaceMock).toHaveBeenCalledWith('/');
  });
});

describe('SelectOrganisationScreen — loading', () => {
  it('renders the skeleton and no cards while loading', () => {
    orgsState.isLoading = true;
    orgsState.data = undefined;
    const root = render();
    expect(byTestId(root, 'org-list-skeleton')).toBeTruthy();
    expect(queryAllByTestId(root, AUTH_TEST_IDS.selectOrg.orgItem('c1'))).toHaveLength(0);
  });
});

describe('SelectOrganisationScreen — error', () => {
  it('renders the error state with a retry action', () => {
    orgsState.isError = true;
    orgsState.data = undefined;
    const root = render();
    expect(textChildren(root)).toContain('selectOrg.errorTitle');
    expect(byTestId(root, 'async-error-action')).toBeTruthy();
  });

  it('refetches when retry is pressed', async () => {
    orgsState.isError = true;
    orgsState.data = undefined;
    const root = render();
    await firePress(byTestId(root, 'async-error-action'));
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });
});
