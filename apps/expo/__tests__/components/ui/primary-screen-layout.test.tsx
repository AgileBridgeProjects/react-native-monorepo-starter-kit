import { Platform, View } from 'react-native';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PrimaryScreenLayout } from '@/components/ui/primary-screen-layout';
import { queryAllByTestId, renderTree } from '@/test/utils/rtr';

const breakpointState = { isTablet: false };

vi.mock('@/src/lib/hooks/use-breakpoints', () => ({
  useBreakpoints: () => ({
    isMobile: !breakpointState.isTablet,
    isTablet: breakpointState.isTablet,
    isDesktop: false,
    numColumns: breakpointState.isTablet ? 2 : 1,
  }),
}));

const originalOS = Platform.OS;

afterEach(() => {
  Platform.OS = originalOS;
  breakpointState.isTablet = false;
});

function content() {
  return (
    <PrimaryScreenLayout hero={<View testID="hero" />} testID="layout">
      <View testID="card" />
    </PrimaryScreenLayout>
  );
}

describe('PrimaryScreenLayout', () => {
  it('renders the hero inside a primary background with a rounded card on native', () => {
    Platform.OS = 'ios';
    const renderer = renderTree(content());

    const root = renderer.root.find(
      (n) => typeof n.type === 'string' && n.props.testID === 'layout',
    );
    expect(root.props.className).toContain('bg-primary');

    // The card sits in a rounded overflow-hidden container.
    const card = renderer.root.find(
      (n) =>
        typeof n.type === 'string' &&
        typeof n.props.className === 'string' &&
        n.props.className.includes('rounded-t-3xl'),
    );
    expect(card).toBeTruthy();
    expect(queryAllByTestId(renderer.root, 'hero')).toHaveLength(1);
    expect(queryAllByTestId(renderer.root, 'card')).toHaveLength(1);
    expect(renderer.toJSON()).toMatchSnapshot();
  });

  it('uses the flat web-mobile layout (no rounded card) on web below the tablet breakpoint', () => {
    Platform.OS = 'web';
    breakpointState.isTablet = false;
    const renderer = renderTree(content());

    const root = renderer.root.find(
      (n) => typeof n.type === 'string' && n.props.testID === 'layout',
    );
    expect(root.props.className).toContain('bg-background');

    // No rounded hero/card split in the web-mobile branch.
    const rounded = renderer.root.findAll(
      (n) =>
        typeof n.type === 'string' &&
        typeof n.props.className === 'string' &&
        n.props.className.includes('rounded-t-3xl'),
    );
    expect(rounded).toHaveLength(0);
    expect(queryAllByTestId(renderer.root, 'hero')).toHaveLength(1);
    expect(queryAllByTestId(renderer.root, 'card')).toHaveLength(1);
    expect(renderer.toJSON()).toMatchSnapshot();
  });

  it('uses the native hero+card layout on web tablets', () => {
    Platform.OS = 'web';
    breakpointState.isTablet = true;
    const renderer = renderTree(content());

    const rounded = renderer.root.findAll(
      (n) =>
        typeof n.type === 'string' &&
        typeof n.props.className === 'string' &&
        n.props.className.includes('rounded-t-3xl'),
    );
    expect(rounded).toHaveLength(1);
  });

  it('merges extra className onto the root container', () => {
    Platform.OS = 'ios';
    const renderer = renderTree(
      <PrimaryScreenLayout hero={<View testID="hero" />} testID="layout" className="gap-md">
        <View testID="card" />
      </PrimaryScreenLayout>,
    );
    const root = renderer.root.find(
      (n) => typeof n.type === 'string' && n.props.testID === 'layout',
    );

    expect(root.props.className).toContain('gap-md');
  });
});
