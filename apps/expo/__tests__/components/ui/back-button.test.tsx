import { View } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { BackButton } from '@/components/ui/back-button';
import { firePress, hostByTestId, renderTree, textChildren } from '@/test/utils/rtr';

const backSpy = vi.fn();

vi.mock('expo-router', () => ({
  useRouter: () => ({ back: backSpy }),
}));

vi.mock('@lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => (key === 'back' ? 'Back' : key) }),
}));

vi.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

vi.mock('@/components/ui/icon', () => ({
  Icon: ({ name, color }: { name: string; color?: string }) => (
    <View testID={`icon-${name}`} accessibilityLabel={color} />
  ),
}));

describe('BackButton', () => {
  it('renders an icon-only button by default with the translated accessibility label', () => {
    const renderer = renderTree(<BackButton testID="back" />);
    const button = hostByTestId(renderer.root, 'back');

    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toBe('Back');
    expect(button.props.accessible).toBeTruthy();
    // No label text rendered when `label` prop is omitted.
    expect(textChildren(renderer.root)).not.toContain('Back');
    expect(renderer.toJSON()).toMatchSnapshot();
  });

  it('renders the label text alongside the chevron when label is provided', () => {
    const renderer = renderTree(<BackButton testID="back" label="Go back" />);

    expect(textChildren(renderer.root)).toContain('Go back');
    expect(hostByTestId(renderer.root, 'back').props.accessibilityLabel).toBe('Go back');
    expect(renderer.toJSON()).toMatchSnapshot();
  });

  it('prefers an explicit accessibilityLabel over the label', () => {
    const renderer = renderTree(
      <BackButton testID="back" label="Go back" accessibilityLabel="Return home" />,
    );

    expect(hostByTestId(renderer.root, 'back').props.accessibilityLabel).toBe('Return home');
  });

  it('forwards the accessibility hint', () => {
    const renderer = renderTree(<BackButton testID="back" accessibilityHint="Returns to list" />);

    expect(hostByTestId(renderer.root, 'back').props.accessibilityHint).toBe('Returns to list');
  });

  it('calls router.back when no onPress is provided', async () => {
    backSpy.mockClear();
    const renderer = renderTree(<BackButton testID="back" />);

    await firePress(hostByTestId(renderer.root, 'back'));

    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it('calls the supplied onPress instead of router.back', async () => {
    backSpy.mockClear();
    const onPress = vi.fn();
    const renderer = renderTree(<BackButton testID="back" onPress={onPress} />);

    await firePress(hostByTestId(renderer.root, 'back'));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(backSpy).not.toHaveBeenCalled();
  });

  it('passes the tint colour to the chevron icon when provided', () => {
    const renderer = renderTree(<BackButton testID="back" tintColor="#ff0000" label="Back" />);
    const icon = hostByTestId(renderer.root, 'icon-chevron.left');

    expect(icon.props.accessibilityLabel).toBe('#ff0000');
  });
});
