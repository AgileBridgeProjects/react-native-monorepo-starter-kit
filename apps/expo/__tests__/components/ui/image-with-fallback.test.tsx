import type React from 'react';
import { act } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { renderTree, type TestNode } from '@/test/utils/rtr';

// The global expo-image mock boxes 'Image' as a String object, which React
// rejects when actually rendered. Re-mock locally as a plain host string.
vi.mock('expo-image', () => ({ Image: 'Image' }));

// The shared react-native-svg mock omits SvgXml; add it so pattern tiles render.
vi.mock('react-native-svg', async () => {
  const actual = await import('@/test/mocks/react-native-svg');
  return { ...actual, default: actual.default, SvgXml: 'SvgXml' };
});

vi.mock('@/components/ui/icon', async () => {
  const React = await import('react');
  return {
    Icon: ({ name }: { name: string }) => React.createElement('View', { testID: `icon-${name}` }),
  };
});

vi.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

const LAYOUT = { nativeEvent: { layout: { width: 100, height: 100 } } };

/** Render then fire onLayout so the measured-dimension branches can run. */
function renderMeasured(element: React.ReactElement) {
  const renderer = renderTree(element);
  const container = renderer.root.findAll((n) => n.type === 'View')[0];
  act(() => {
    container.props.onLayout?.(LAYOUT);
  });
  return renderer;
}

const findImage = (root: TestNode) => root.findAll((n) => n.type === 'Image');

describe('ImageWithFallback', () => {
  it('exposes the accessibility label on the container', () => {
    const { root } = renderTree(
      <ImageWithFallback uri="https://cdn/test.png" accessibilityLabel="Game cover" />,
    );
    const container = root.findAll((n) => n.type === 'View')[0];
    expect(container.props.accessibilityLabel).toBe('Game cover');
    expect(container.props.accessible).toBeTruthy();
  });

  it('renders the remote image with cache + recycling configuration', () => {
    const { root } = renderTree(
      <ImageWithFallback
        uri="https://cdn/test.png"
        accessibilityLabel="Cover"
        contentFit="contain"
      />,
    );
    const image = findImage(root)[0];
    expect(image).toBeDefined();
    expect(image.props.source).toEqual({ uri: 'https://cdn/test.png' });
    expect(image.props.contentFit).toBe('contain');
    expect(image.props.cachePolicy).toBe('memory-disk');
    expect(image.props.recyclingKey).toBe('https://cdn/test.png');
  });

  it('renders no image element when the uri is null', () => {
    const { root } = renderTree(<ImageWithFallback uri={null} accessibilityLabel="Empty cover" />);
    expect(findImage(root)).toHaveLength(0);
  });

  it('shows the fallback mosaic once the container has been measured and the image has not loaded', () => {
    const { root } = renderMeasured(
      <ImageWithFallback uri={null} accessibilityLabel="Empty cover" />,
    );
    // Default fallback icon is square.grid.3x3.fill; the mosaic tiles many of them.
    expect(
      root.findAll((n) => n.props.testID === 'icon-square.grid.3x3.fill').length,
    ).toBeGreaterThan(0);
  });

  it('respects a custom fallback icon', () => {
    const { root } = renderMeasured(
      <ImageWithFallback uri={null} accessibilityLabel="Empty" fallbackIcon="photo.fill" />,
    );
    expect(root.findAll((n) => n.props.testID === 'icon-photo.fill').length).toBeGreaterThan(0);
    expect(root.findAll((n) => n.props.testID === 'icon-square.grid.3x3.fill')).toHaveLength(0);
  });

  it('hides the mosaic once the image reports a successful load', () => {
    const { root } = renderMeasured(
      <ImageWithFallback uri="https://cdn/test.png" accessibilityLabel="Cover" />,
    );
    expect(
      root.findAll((n) => n.props.testID === 'icon-square.grid.3x3.fill').length,
    ).toBeGreaterThan(0);

    act(() => {
      findImage(root)[0].props.onLoad?.();
    });

    expect(root.findAll((n) => n.props.testID === 'icon-square.grid.3x3.fill')).toHaveLength(0);
  });

  it('restores the mosaic when the image reports a load error', () => {
    const { root } = renderMeasured(
      <ImageWithFallback uri="https://cdn/test.png" accessibilityLabel="Cover" />,
    );
    act(() => {
      findImage(root)[0].props.onLoad?.();
    });
    expect(root.findAll((n) => n.props.testID === 'icon-square.grid.3x3.fill')).toHaveLength(0);

    act(() => {
      findImage(root)[0].props.onError?.();
    });
    expect(
      root.findAll((n) => n.props.testID === 'icon-square.grid.3x3.fill').length,
    ).toBeGreaterThan(0);
  });

  it('does not render the mosaic before the container is measured', () => {
    const { root } = renderTree(<ImageWithFallback uri={null} accessibilityLabel="Empty" />);
    expect(root.findAll((n) => n.props.testID === 'icon-square.grid.3x3.fill')).toHaveLength(0);
  });

  it('matches the remote-image snapshot', () => {
    const { toJSON } = renderTree(
      <ImageWithFallback uri="https://cdn/test.png" accessibilityLabel="Cover" />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches the null-uri fallback snapshot', () => {
    const { toJSON } = renderTree(<ImageWithFallback uri={null} accessibilityLabel="Empty" />);
    expect(toJSON()).toMatchSnapshot();
  });
});
