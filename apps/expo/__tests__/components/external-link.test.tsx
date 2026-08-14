import type { Href } from 'expo-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ExternalLink } from '@/components/external-link';
import { renderTree, type TestNode } from '@/test/utils/rtr';

const browser = vi.hoisted(() => ({
  openBrowserAsync: vi.fn((..._args: unknown[]) => Promise.resolve(undefined)),
}));

vi.mock('expo-web-browser', () => ({
  // Delegate lazily so a per-test reset of `browser.openBrowserAsync` is observed by
  // the binding the source captured at import time.
  openBrowserAsync: (...args: unknown[]) => browser.openBrowserAsync(...args),
  WebBrowserPresentationStyle: { AUTOMATIC: 'automatic' },
}));

// expo-router's Link is the string 'Link' from the global setup mock; it renders as a
// host node so we can read href / onPress / target straight off its props.
const link = (root: TestNode): TestNode => root.find((n) => n.type === 'Link');

const HREF = 'https://example.com/terms' as Href & string;

const originalEXPO_OS = process.env.EXPO_OS;

beforeEach(() => {
  browser.openBrowserAsync.mockClear();
});

afterEach(() => {
  process.env.EXPO_OS = originalEXPO_OS;
});

describe('ExternalLink', () => {
  it('renders a Link with the given href and target=_blank', () => {
    const { root } = renderTree(<ExternalLink href={HREF} />);
    const node = link(root);
    expect(node.props.href).toBe(HREF);
    expect(node.props.target).toBe('_blank');
  });

  it('forwards extra props to the Link', () => {
    const { root } = renderTree(
      <ExternalLink href={HREF} testID="ext" accessibilityLabel="Terms" />,
    );
    const node = link(root);
    expect(node.props.testID).toBe('ext');
    expect(node.props.accessibilityLabel).toBe('Terms');
  });

  it('opens the in-app browser and prevents default on native', async () => {
    process.env.EXPO_OS = 'ios';
    const { root } = renderTree(<ExternalLink href={HREF} />);
    const preventDefault = vi.fn();

    await link(root).props.onPress({ preventDefault });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(browser.openBrowserAsync).toHaveBeenCalledWith(HREF, {
      presentationStyle: 'automatic',
    });
  });

  it('does NOT intercept the press on web (lets the anchor navigate)', async () => {
    process.env.EXPO_OS = 'web';
    const { root } = renderTree(<ExternalLink href={HREF} />);
    const preventDefault = vi.fn();

    await link(root).props.onPress({ preventDefault });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(browser.openBrowserAsync).not.toHaveBeenCalled();
  });

  it('matches the default snapshot', () => {
    const { toJSON } = renderTree(<ExternalLink href={HREF} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
