import { Text } from 'react-native';
import { describe, expect, it } from 'vitest';

import { Card } from '@/components/ui/card';
import { hostByTestId, renderTree, textChildren } from '@/test/utils/rtr';

describe('Card', () => {
  it('renders a View with the default surface classes', () => {
    const { root } = renderTree(<Card testID="card" />);
    const view = hostByTestId(root, 'card');
    expect(view.props.className).toBe('rounded-2xl bg-brand-blue-card-dark p-lg');
  });

  it('merges extra classes with the defaults', () => {
    const { root } = renderTree(<Card testID="card" className="mx-lg mt-lg" />);
    const view = hostByTestId(root, 'card');
    expect(view.props.className).toContain('mx-lg');
    expect(view.props.className).toContain('mt-lg');
    expect(view.props.className).toContain('rounded-2xl');
  });

  it('does not bake in a default gap — callers set their own explicitly', () => {
    // tailwind-merge doesn't dedupe this project's token-based gap-* classes,
    // so a baked-in default gap could sit alongside (not be replaced by) a
    // caller's gap class. Card leaves gap out of its defaults entirely.
    const { root } = renderTree(<Card testID="card" className="gap-md" />);
    const view = hostByTestId(root, 'card');
    expect(view.props.className).toContain('gap-md');
    expect(view.props.className).not.toContain('gap-xs');
  });

  it('renders children on top of the surface', () => {
    const { root } = renderTree(
      <Card>
        <Text>Hello</Text>
      </Card>,
    );
    expect(textChildren(root)).toContain('Hello');
  });

  it('matches the default snapshot', () => {
    const { toJSON } = renderTree(
      <Card testID="card">
        <Text>Content</Text>
      </Card>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
