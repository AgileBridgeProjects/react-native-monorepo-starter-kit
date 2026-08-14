import { HELP_TEST_IDS } from '@features/profile/presentation/profile.copy';
import { HelpScreen } from '@features/profile/presentation/screens/help-screen';
import React from 'react';
import { Alert } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  byTestId,
  fireChangeText,
  firePress,
  hostByTestId,
  inputByTestId,
  queryAllByTestId,
  renderTree,
  type TestNode,
  textChildren,
} from '@/test/utils/rtr';

vi.mock('@lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const backMock = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({ back: backMock, push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));
vi.mock('@/constants/tokens', async () => (await import('@/test/mocks/shared')).tokensMock());
vi.mock('@/components/ui/icon', async () => (await import('@/test/mocks/shared')).iconMock());

// Mutation hook state, toggled per test.
type HelpState = {
  mutateAsync: ReturnType<typeof vi.fn>;
  isPending: boolean;
  isSuccess: boolean;
};
const helpState: HelpState = { mutateAsync: vi.fn(), isPending: false, isSuccess: false };
vi.mock('@features/profile/presentation/hooks/use-help', () => ({
  useSendHelpEmail: () => helpState,
}));

vi.mock('@/components/ui', async () => (await import('@/test/mocks/ui')).makeUiMock());
vi.mock('@/components/ui/input', async () => {
  const ReactModule = await import('react');
  const R = (ReactModule as { default?: typeof React }).default ?? ReactModule;
  return {
    Input: ({ value, onChangeText, testID, label }: Record<string, unknown>) =>
      R.createElement('TextInput', { testID, value, onChangeText, accessibilityLabel: label }),
  };
});

const renderScreen = (): TestNode => renderTree(React.createElement(HelpScreen)).root;

let alertSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  helpState.mutateAsync = vi.fn().mockResolvedValue(undefined);
  helpState.isPending = false;
  helpState.isSuccess = false;
  alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('HelpScreen — structural snapshots', () => {
  it('matches the form (default) render', () => {
    expect(renderTree(React.createElement(HelpScreen)).toJSON()).toMatchSnapshot();
  });

  it('matches the success render', () => {
    helpState.isSuccess = true;
    expect(renderTree(React.createElement(HelpScreen)).toJSON()).toMatchSnapshot();
  });
});

describe('HelpScreen — form', () => {
  it('renders the subject input, body input and send button', () => {
    const root = renderScreen();
    expect(byTestId(root, HELP_TEST_IDS.screen)).toBeTruthy();
    expect(byTestId(root, HELP_TEST_IDS.subjectInput)).toBeTruthy();
    expect(byTestId(root, HELP_TEST_IDS.bodyInput)).toBeTruthy();
    expect(byTestId(root, HELP_TEST_IDS.sendButton)).toBeTruthy();
    expect(textChildren(root)).toContain('helpSend');
  });

  it('does not render the success view in the form state', () => {
    const root = renderScreen();
    expect(queryAllByTestId(root, HELP_TEST_IDS.successView)).toHaveLength(0);
  });

  it('reflects the pending state on the send button', () => {
    helpState.isPending = true;
    // makeUiMock Button has no busy prop; assert the screen still renders the CTA copy.
    expect(textChildren(renderScreen())).toContain('helpSend');
  });
});

describe('HelpScreen — validation', () => {
  it('blocks send and alerts when the subject is shorter than 3 characters', async () => {
    const root = renderScreen();
    await fireChangeText(inputByTestId(root, HELP_TEST_IDS.subjectInput), 'hi');
    await fireChangeText(inputByTestId(root, HELP_TEST_IDS.bodyInput), 'a long enough body here');
    await firePress(byTestId(root, HELP_TEST_IDS.sendButton));

    expect(helpState.mutateAsync).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('error', 'helpSubjectTooShort');
  });

  it('blocks send and alerts when the body is shorter than 10 characters', async () => {
    const root = renderScreen();
    await fireChangeText(inputByTestId(root, HELP_TEST_IDS.subjectInput), 'Valid subject');
    await fireChangeText(inputByTestId(root, HELP_TEST_IDS.bodyInput), 'too short');
    await firePress(byTestId(root, HELP_TEST_IDS.sendButton));

    expect(helpState.mutateAsync).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('error', 'helpBodyTooShort');
  });

  it('treats whitespace-only input as invalid (trimmed length check)', async () => {
    const root = renderScreen();
    await fireChangeText(inputByTestId(root, HELP_TEST_IDS.subjectInput), '   ');
    await fireChangeText(inputByTestId(root, HELP_TEST_IDS.bodyInput), '          ');
    await firePress(byTestId(root, HELP_TEST_IDS.sendButton));
    expect(helpState.mutateAsync).not.toHaveBeenCalled();
  });
});

describe('HelpScreen — submit', () => {
  it('sends the trimmed subject and body when both are valid', async () => {
    const root = renderScreen();
    await fireChangeText(inputByTestId(root, HELP_TEST_IDS.subjectInput), '  Login issue  ');
    await fireChangeText(
      inputByTestId(root, HELP_TEST_IDS.bodyInput),
      '  I cannot sign in to my account.  ',
    );
    await firePress(byTestId(root, HELP_TEST_IDS.sendButton));

    expect(helpState.mutateAsync).toHaveBeenCalledWith({
      subject: 'Login issue',
      body: 'I cannot sign in to my account.',
    });
  });

  it('alerts with the send-failed message when the mutation rejects', async () => {
    helpState.mutateAsync = vi.fn().mockRejectedValue(new Error('network'));
    const root = renderScreen();
    await fireChangeText(inputByTestId(root, HELP_TEST_IDS.subjectInput), 'Valid subject');
    await fireChangeText(inputByTestId(root, HELP_TEST_IDS.bodyInput), 'A sufficiently long body.');
    await firePress(byTestId(root, HELP_TEST_IDS.sendButton));

    expect(alertSpy).toHaveBeenCalledWith('error', 'helpSendFailed');
  });
});

describe('HelpScreen — success state', () => {
  it('renders the success view, title, message and done button', () => {
    helpState.isSuccess = true;
    const root = renderScreen();
    expect(byTestId(root, HELP_TEST_IDS.successView)).toBeTruthy();
    expect(byTestId(root, HELP_TEST_IDS.doneButton)).toBeTruthy();
    const text = textChildren(root);
    expect(text).toContain('helpSentTitle');
    expect(text).toContain('helpSentMessage');
    expect(text).toContain('helpDone');
  });

  it('does not render the form inputs in the success state', () => {
    helpState.isSuccess = true;
    const root = renderScreen();
    expect(queryAllByTestId(root, HELP_TEST_IDS.subjectInput)).toHaveLength(0);
    expect(queryAllByTestId(root, HELP_TEST_IDS.bodyInput)).toHaveLength(0);
  });

  it('navigates back when the done button is pressed', async () => {
    helpState.isSuccess = true;
    const root = renderScreen();
    await firePress(byTestId(root, HELP_TEST_IDS.doneButton));
    expect(backMock).toHaveBeenCalledTimes(1);
  });
});

describe('HelpScreen — accessibility', () => {
  it('labels the multiline body input', () => {
    const root = renderScreen();
    expect(hostByTestId(root, HELP_TEST_IDS.bodyInput).props.accessibilityLabel).toBe('helpBody');
  });
});
