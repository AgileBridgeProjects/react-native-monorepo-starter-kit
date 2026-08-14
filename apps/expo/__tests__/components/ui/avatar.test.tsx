import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { Avatar } from '@/components/ui/avatar';

vi.mock('@lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('Avatar', () => {
  it('derives initials from name when initials are not provided', () => {
    let renderer: ReturnType<typeof create> | undefined;

    act(() => {
      renderer = create(<Avatar name="Morgan Davis" variant="ranked" size="lg" />);
    });

    if (!renderer) {
      throw new Error('Expected avatar renderer to be created.');
    }

    const text = renderer.root
      .findAllByType(Text)
      .flatMap((node: { props: { children?: unknown } }) => node.props.children);

    expect(text).toContain('MD');
  });

  it('renders initials for the ranked variant', () => {
    let renderer: ReturnType<typeof create> | undefined;

    act(() => {
      renderer = create(<Avatar initials="MD" variant="ranked" size="lg" />);
    });

    if (!renderer) {
      throw new Error('Expected avatar renderer to be created.');
    }

    const text = renderer.root
      .findAllByType(Text)
      .flatMap((node: { props: { children?: unknown } }) => node.props.children);

    expect(text).toContain('MD');
  });

  it('renders an overlaid rank badge when rank is provided', () => {
    let renderer: ReturnType<typeof create> | undefined;

    act(() => {
      renderer = create(<Avatar initials="MD" variant="ranked" size="lg" rank={1} />);
    });

    if (!renderer) {
      throw new Error('Expected avatar renderer to be created.');
    }

    const text = renderer.root
      .findAllByType(Text)
      .flatMap((node: { props: { children?: unknown } }) => node.props.children);

    expect(text).toContain('MD');
    expect(text).toContain(1);
  });

  it('centers the rank badge horizontally', () => {
    let renderer: ReturnType<typeof create> | undefined;

    act(() => {
      renderer = create(<Avatar initials="MD" variant="ranked" size="lg" rank={1} />);
    });

    if (!renderer) {
      throw new Error('Expected avatar renderer to be created.');
    }

    const centeredBadge = renderer.root.findAll(
      (node: { props: { className?: unknown } }) =>
        typeof node.props.className === 'string' &&
        node.props.className.includes('left-1/2') &&
        node.props.className.includes('-translate-x-1/2'),
    );

    expect(centeredBadge.length).toBe(1);
  });
});
