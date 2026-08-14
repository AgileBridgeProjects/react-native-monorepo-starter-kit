import { Platform, View } from 'react-native';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ContentSheet } from '@/components/ui/content-sheet';
import { hostByTestId, queryAllByTestId, renderTree } from '@/test/utils/rtr';

const onlineState = { value: true };

vi.mock('@lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => (key === 'statusBanner.offline' ? 'You are offline' : key),
  }),
}));

vi.mock('@/src/lib/hooks/use-is-online', () => ({
  useIsOnline: () => onlineState.value,
}));

vi.mock('@/components/ui/info-banner', () => ({
  InfoBanner: ({ message }: { message: string }) => (
    <View testID="info-banner" accessibilityLabel={message} />
  ),
}));

const originalOS = Platform.OS;

afterEach(() => {
  onlineState.value = true;
  Platform.OS = originalOS;
});

describe('ContentSheet', () => {
  it('renders children and no banner when online', () => {
    onlineState.value = true;
    const renderer = renderTree(
      <ContentSheet>
        <View testID="content" />
      </ContentSheet>,
    );

    expect(queryAllByTestId(renderer.root, 'content')).toHaveLength(1);
    expect(queryAllByTestId(renderer.root, 'info-banner')).toHaveLength(0);
    expect(renderer.toJSON()).toMatchSnapshot();
  });

  it('renders the offline banner above the content when offline', () => {
    onlineState.value = false;
    const renderer = renderTree(
      <ContentSheet>
        <View testID="content" />
      </ContentSheet>,
    );

    const banner = hostByTestId(renderer.root, 'info-banner');
    expect(banner.props.accessibilityLabel).toBe('You are offline');
    expect(queryAllByTestId(renderer.root, 'content')).toHaveLength(1);
    expect(renderer.toJSON()).toMatchSnapshot();
  });

  it('uses a custom offline banner message when provided', () => {
    onlineState.value = false;
    const renderer = renderTree(
      <ContentSheet offlineBannerMessage="No connection">
        <View testID="content" />
      </ContentSheet>,
    );

    expect(hostByTestId(renderer.root, 'info-banner').props.accessibilityLabel).toBe(
      'No connection',
    );
  });

  it('suppresses the banner when hideStatusBanner is set even while offline', () => {
    onlineState.value = false;
    const renderer = renderTree(
      <ContentSheet hideStatusBanner>
        <View testID="content" />
      </ContentSheet>,
    );

    expect(queryAllByTestId(renderer.root, 'info-banner')).toHaveLength(0);
  });

  it('merges extra className onto the wrapper', () => {
    onlineState.value = true;
    const renderer = renderTree(
      <ContentSheet className="px-lg">
        <View testID="content" />
      </ContentSheet>,
    );
    const wrapper = renderer.root.find(
      (n) => typeof n.type === 'string' && typeof n.props.className === 'string',
    );

    expect(wrapper.props.className).toContain('px-lg');
  });

  it('renders the web branch with the banner and children when on web', () => {
    Platform.OS = 'web';
    onlineState.value = false;
    const renderer = renderTree(
      <ContentSheet>
        <View testID="content" />
      </ContentSheet>,
    );

    expect(queryAllByTestId(renderer.root, 'info-banner')).toHaveLength(1);
    expect(queryAllByTestId(renderer.root, 'content')).toHaveLength(1);
  });
});
