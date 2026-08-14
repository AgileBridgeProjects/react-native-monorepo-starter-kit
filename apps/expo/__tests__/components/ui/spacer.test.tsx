import { describe, expect, it } from 'vitest';

import { Spacer } from '@/components/ui/spacer';
import { renderTree } from '@/test/utils/rtr';

describe('Spacer', () => {
  it('renders a View with the default height class', () => {
    const { root } = renderTree(<Spacer />);
    const view = root.findAll((n) => n.type === 'View')[0];
    expect(view.props.className).toBe('h-sm');
  });

  it('applies a custom className when provided', () => {
    const { root } = renderTree(<Spacer className="h-md" />);
    const view = root.findAll((n) => n.type === 'View')[0];
    expect(view.props.className).toBe('h-md');
  });

  it('accepts arbitrary spacing tokens', () => {
    const sizes = ['h-xs', 'h-lg', 'h-xl', 'h-2xl'];
    for (const size of sizes) {
      const { root } = renderTree(<Spacer className={size} />);
      const view = root.findAll((n) => n.type === 'View')[0];
      expect(view.props.className).toBe(size);
    }
  });

  it('matches the default snapshot', () => {
    const { toJSON } = renderTree(<Spacer />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches the custom-size snapshot', () => {
    const { toJSON } = renderTree(<Spacer className="h-2xl" />);
    expect(toJSON()).toMatchSnapshot();
  });
});
