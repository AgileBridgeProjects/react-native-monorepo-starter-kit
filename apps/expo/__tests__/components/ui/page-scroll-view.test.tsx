import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import { describe, expect, it } from 'vitest';
import { PageScrollView } from '@/components/ui/page-scroll-view';

describe('PageScrollView', () => {
  it('renders a standard page title, description, and children', () => {
    let renderer: ReturnType<typeof create> | undefined;

    act(() => {
      renderer = create(
        <PageScrollView title="Rewards" description="Track earned achievements.">
          <Text>Child content</Text>
        </PageScrollView>,
      );
    });

    if (!renderer) {
      throw new Error('Expected page scroll view renderer to be created.');
    }

    const title = renderer.root.findByProps({ testID: 'rewards-title' });
    const textContent = renderer.root
      .findAllByType(Text)
      .flatMap((node: { props: { children?: unknown } }) => node.props.children);

    expect(title.props.children).toBe('Rewards');
    expect(textContent).toContain('Track earned achievements.');
    expect(textContent).toContain('Child content');
  });
});
