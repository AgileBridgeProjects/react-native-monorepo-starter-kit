import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusBadge } from '@/components/ui/status-badge';

describe('StatusBadge', () => {
  it('renders the provided label', () => {
    render(<StatusBadge label="Active" />);
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('renders a span element', () => {
    const { container } = render(<StatusBadge label="Test" />);
    expect(container.querySelector('span')).not.toBeNull();
  });

  it('applies the success variant class', () => {
    const { container } = render(<StatusBadge label="Ok" variant="success" />);
    const span = container.querySelector('span');
    expect(span?.className).toContain('text-success');
  });

  it('applies the error variant class', () => {
    const { container } = render(<StatusBadge label="Fail" variant="error" />);
    const span = container.querySelector('span');
    expect(span?.className).toContain('text-error');
  });

  it('applies extra className via prop', () => {
    const { container } = render(<StatusBadge label="Extra" className="my-custom-class" />);
    const span = container.querySelector('span');
    expect(span?.className).toContain('my-custom-class');
  });

  it('uses neutral variant by default', () => {
    const { container } = render(<StatusBadge label="Default" />);
    const span = container.querySelector('span');
    expect(span?.className).toContain('text-text-secondary');
  });
});
