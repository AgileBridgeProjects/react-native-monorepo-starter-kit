/// <reference types="@testing-library/jest-dom" />
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DrawerPanel } from '../drawer-panel';

// ─── Mock DevExtreme components ───────────────────────────────────────────────
vi.mock('devextreme-react/drawer', () => ({
  default: ({ opened, render: renderFn }: { opened: boolean; render: () => React.ReactNode }) =>
    opened ? renderFn() : null,
}));

vi.mock('devextreme-react/scroll-view', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('devextreme-react/button', () => ({
  default: ({
    onClick,
    elementAttr,
  }: {
    onClick?: () => void;
    elementAttr?: Record<string, string>;
  }) => (
    <button type="button" onClick={onClick} aria-label={elementAttr?.['aria-label']}>
      close
    </button>
  ),
}));

vi.mock('../typography', () => ({
  Typography: ({ children, id }: { children: React.ReactNode; id?: string }) => (
    <h4 id={id}>{children}</h4>
  ),
}));

vi.mock('@lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@starterkit/shared', () => ({
  cn: (...args: (string | undefined | null | false)[]) => args.filter(Boolean).join(' '),
  iconSize: { xs: 16, sm: 20, md: 28, lg: 48 },
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DrawerPanel', () => {
  const defaultProps = {
    title: 'Edit club',
    visible: true,
    onHide: vi.fn(),
    children: <p>Form content</p>,
  };

  it('renders children when visible', () => {
    render(<DrawerPanel {...defaultProps} />);
    expect(screen.getByText('Form content')).toBeInTheDocument();
  });

  it('does not render children when not visible', () => {
    render(<DrawerPanel {...defaultProps} visible={false} />);
    // Pure CSS drawer keeps children in DOM for smooth animations;
    // the panel is hidden from the accessibility tree via aria-hidden.
    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(dialog).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders the title', () => {
    render(<DrawerPanel {...defaultProps} />);
    expect(screen.getByText('Edit club')).toBeInTheDocument();
  });

  it('calls onHide when close button is clicked', () => {
    const onHide = vi.fn();
    render(<DrawerPanel {...defaultProps} onHide={onHide} />);
    const closeButtons = screen.getAllByRole('button', { name: 'common:actions.closePanel' });
    fireEvent.click(closeButtons[0]);
    expect(onHide).toHaveBeenCalledOnce();
  });

  it('calls onHide when ESC key is pressed', () => {
    const onHide = vi.fn();
    render(<DrawerPanel {...defaultProps} onHide={onHide} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onHide).toHaveBeenCalledOnce();
  });

  it('does not call onHide on ESC when not visible', () => {
    const onHide = vi.fn();
    render(<DrawerPanel {...defaultProps} visible={false} onHide={onHide} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onHide).not.toHaveBeenCalled();
  });

  it('has role="dialog" and aria-modal when visible', () => {
    render(<DrawerPanel {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('renders bottomContent in a pinned footer when provided', () => {
    render(<DrawerPanel {...defaultProps} bottomContent={<p>Footer actions</p>} />);
    expect(screen.getByText('Footer actions')).toBeInTheDocument();
  });

  it('does not render a footer when bottomContent is omitted', () => {
    render(<DrawerPanel {...defaultProps} />);
    expect(screen.queryByText('Footer actions')).toBeNull();
  });

  it('has aria-labelledby pointing to the title', () => {
    render(<DrawerPanel {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    const titleEl = document.getElementById(labelledBy ?? '');
    expect(titleEl).toHaveTextContent('Edit club');
  });
});
