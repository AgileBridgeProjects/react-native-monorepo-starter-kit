import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Typography } from '@/components/ui/typography';

describe('Typography', () => {
  it('renders children', () => {
    render(<Typography>Hello world</Typography>);
    expect(screen.getByText('Hello world')).toBeTruthy();
  });

  it('renders h1 element for variant="h1"', () => {
    const { container } = render(<Typography variant="h1">Title</Typography>);
    expect(container.querySelector('h1')).not.toBeNull();
  });

  it('renders h2 element for variant="h2"', () => {
    const { container } = render(<Typography variant="h2">Section</Typography>);
    expect(container.querySelector('h2')).not.toBeNull();
  });

  it('renders p element for variant="body" (default)', () => {
    const { container } = render(<Typography>Body text</Typography>);
    expect(container.querySelector('p')).not.toBeNull();
  });

  it('renders span element for variant="label"', () => {
    const { container } = render(<Typography variant="label">Label</Typography>);
    expect(container.querySelector('span')).not.toBeNull();
  });

  it('allows overriding the rendered element via "as" prop', () => {
    const { container } = render(
      <Typography variant="h1" as="div">
        Override
      </Typography>,
    );
    expect(container.querySelector('div')).not.toBeNull();
    expect(container.querySelector('h1')).toBeNull();
  });

  it('applies extra className', () => {
    const { container } = render(<Typography className="my-class">Text</Typography>);
    const el = container.firstElementChild;
    expect(el?.className).toContain('my-class');
  });
});
