import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from '@/components/ui/empty-state';

describe('EmptyState', () => {
  it('renders the provided content', () => {
    render(
      <EmptyState
        icon={<span data-testid="empty-icon">icon</span>}
        title="Nothing here"
        description="Add an item to get started."
        action={<button type="button">Create</button>}
      />,
    );

    expect(screen.getByTestId('empty-icon')).toBeTruthy();
    expect(screen.getByText('Nothing here')).toBeTruthy();
    expect(screen.getByText('Add an item to get started.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create' })).toBeTruthy();
  });

  it('applies the bare surface variant', () => {
    const { container } = render(<EmptyState description="No rows" surface="bare" />);
    const root = container.firstElementChild;

    expect(root?.className).toContain('px-12');
    expect(root?.className).toContain('py-6');
  });
});
