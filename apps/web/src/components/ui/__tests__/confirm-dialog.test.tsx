/// <reference types="@testing-library/jest-dom" />
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '../confirm-dialog';

// ─── Mock DevExtreme Popup ─────────────────────────────────────────────────────
vi.mock('devextreme-react/popup', () => ({
  default: ({
    visible,
    children,
    title,
    onHiding,
  }: {
    visible: boolean;
    children: React.ReactNode;
    title: string;
    onHiding: () => void;
  }) =>
    visible ? (
      <div role="dialog" aria-label={title} data-testid="confirm-dialog">
        <button type="button" onClick={onHiding} aria-label="close" />
        {children}
      </div>
    ) : null,
}));

// ─── Mock shared Button to avoid DX deps ──────────────────────────────────────
vi.mock('../button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    isLoading,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    isLoading?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled ?? isLoading}>
      {isLoading ? 'Loading...' : children}
    </button>
  ),
}));

vi.mock('../typography', () => ({
  Typography: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ConfirmDialog', () => {
  const defaultProps = {
    visible: true,
    title: 'Confirm action',
    message: 'Are you sure?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders when visible is true', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('does not render when visible is false', () => {
    render(<ConfirmDialog {...defaultProps} visible={false} />);
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('common:actions.confirm'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('common:actions.cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onCancel when the DX Popup close button is clicked', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('disables confirm button when isLoading is true', () => {
    render(<ConfirmDialog {...defaultProps} isLoading />);
    const confirmBtn = screen.getByText('Loading...');
    expect(confirmBtn).toBeDisabled();
  });

  it('uses custom confirmLabel when provided', () => {
    render(<ConfirmDialog {...defaultProps} confirmLabel="Yes, delete" />);
    expect(screen.getByText('Yes, delete')).toBeInTheDocument();
  });

  it('uses custom cancelLabel when provided', () => {
    render(<ConfirmDialog {...defaultProps} cancelLabel="No, keep it" />);
    expect(screen.getByText('No, keep it')).toBeInTheDocument();
  });

  it('renders ReactNode message content', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        message={
          <>
            Delete <strong>Acme Corp</strong>?
          </>
        }
      />,
    );
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });
});
