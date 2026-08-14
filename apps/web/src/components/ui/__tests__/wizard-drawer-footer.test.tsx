import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WizardDrawerFooter } from '../wizard-drawer-footer';

describe('WizardDrawerFooter', () => {
  it('renders leading content and actions', () => {
    render(
      <WizardDrawerFooter
        leading={<span>pagination</span>}
        actions={<button type="button">next</button>}
      />,
    );

    expect(screen.getByText('pagination')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'next' })).toBeTruthy();
  });

  it('right-aligns actions when no leading content is provided', () => {
    const { container } = render(
      <WizardDrawerFooter actions={<button type="button">done</button>} />,
    );

    expect(container.firstElementChild?.className).toContain('justify-end');
    expect(screen.getByRole('button', { name: 'done' })).toBeTruthy();
  });
});
