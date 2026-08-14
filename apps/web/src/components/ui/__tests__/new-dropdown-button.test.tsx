import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NewDropdownButton } from '../new-dropdown-button';

vi.mock('@lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('NewDropdownButton', () => {
  it('opens the menu on hover and executes an enabled action', () => {
    const onClick = vi.fn();

    render(
      <NewDropdownButton
        testId="new-menu"
        items={[
          {
            id: 'game',
            label: 'New game schedule',
            onClick,
          },
        ]}
      />,
    );

    fireEvent.mouseEnter(screen.getByTestId('new-menu'));

    fireEvent.click(screen.getByRole('menuitem', { name: 'New game schedule' }));

    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('does not execute disabled actions', () => {
    const onClick = vi.fn();

    render(
      <NewDropdownButton
        testId="new-menu"
        items={[
          {
            id: 'reward',
            label: 'Reward schedule',
            disabled: true,
            onClick,
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByTestId('new-menu'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Reward schedule' }));

    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('menu')).toBeTruthy();
  });

  it('closes when clicking outside the dropdown', () => {
    render(
      <div>
        <NewDropdownButton
          testId="new-menu"
          items={[
            {
              id: 'topic',
              label: 'New topic schedule',
              onClick: vi.fn(),
            },
          ]}
        />
        <button type="button">Outside</button>
      </div>,
    );

    fireEvent.click(screen.getByTestId('new-menu'));
    expect(screen.getByRole('menu')).toBeTruthy();

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside' }));

    expect(screen.queryByRole('menu')).toBeNull();
  });
});
