import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActionMenu } from '@/components/ui/action-menu';

describe('ActionMenu', () => {
  const items = [
    { label: 'Edit', onClick: vi.fn() },
    { label: 'Delete', onClick: vi.fn() },
  ];

  it('does not focus the first action when opened with a pointer', async () => {
    render(<ActionMenu aria-label="Club actions" items={items} />);

    fireEvent.click(screen.getByRole('button', { name: 'Club actions' }));

    const menu = await screen.findByRole('menu');
    await waitFor(() => expect(menu).toHaveFocus());
    expect(screen.getByRole('menuitem', { name: 'Edit' })).not.toHaveFocus();
  });

  it('focuses the first action when opened with the keyboard', async () => {
    render(<ActionMenu aria-label="Club actions" items={items} />);

    fireEvent.keyDown(screen.getByRole('button', { name: 'Club actions' }), { key: 'Enter' });

    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus());
  });

  describe('async loading state', () => {
    it('keeps menu open and shows spinner while async onClick is pending', async () => {
      let resolveAction: () => void = () => {};
      const asyncHandler = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveAction = resolve;
          }),
      );

      render(
        <ActionMenu
          aria-label="Actions"
          items={[
            { label: 'Save', onClick: asyncHandler },
            { label: 'Cancel', onClick: vi.fn() },
          ]}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Save' }));

      // Menu stays open while pending
      expect(screen.getByRole('menu')).toBeInTheDocument();

      // Loading spinner appears on the clicked item
      const saveItem = screen.getByRole('menuitem', { name: /save/i });
      expect(saveItem.querySelector('[aria-label]')).toBeInTheDocument();

      // Other items are disabled
      expect(screen.getByRole('menuitem', { name: 'Cancel' })).toBeDisabled();

      // Resolve and wait for menu to close
      resolveAction();
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    });

    it('closes menu after async onClick rejects', async () => {
      let rejectAction: () => void = () => {};
      const asyncHandler = vi.fn(
        () =>
          new Promise<void>((_, reject) => {
            rejectAction = reject;
          }),
      );

      render(
        <ActionMenu aria-label="Actions" items={[{ label: 'Delete', onClick: asyncHandler }]} />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));

      rejectAction();
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    });

    it('closes menu immediately for synchronous onClick', async () => {
      const syncHandler = vi.fn(() => undefined);

      render(<ActionMenu aria-label="Actions" items={[{ label: 'Edit', onClick: syncHandler }]} />);

      fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }));

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('shows spinner and disables others when isLoading is set externally', async () => {
      render(
        <ActionMenu
          aria-label="Actions"
          items={[
            { label: 'Navigate', onClick: vi.fn(), isLoading: true },
            { label: 'Cancel', onClick: vi.fn() },
          ]}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Actions' }));

      await screen.findByRole('menu');

      expect(screen.getByRole('menuitem', { name: 'Cancel' })).toBeDisabled();
    });

    it('does not call onClick when item is already loading', async () => {
      const handler = vi.fn();

      render(
        <ActionMenu
          aria-label="Actions"
          items={[{ label: 'Navigate', onClick: handler, isLoading: true }]}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Navigate' }));

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
