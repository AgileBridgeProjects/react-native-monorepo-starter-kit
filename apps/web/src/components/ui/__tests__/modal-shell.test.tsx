/// <reference types="@testing-library/jest-dom" />
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ModalShell } from '../modal-shell';

// ─── Mock DevExtreme Popup ────────────────────────────────────────────────────
vi.mock('devextreme-react/popup', () => ({
  default: ({
    visible,
    children,
    onHiding,
    wrapperAttr,
  }: {
    visible: boolean;
    children: React.ReactNode;
    onHiding: () => void;
    wrapperAttr?: Record<string, string>;
  }) =>
    visible ? (
      <div role="dialog" data-testid={wrapperAttr?.['data-testid'] ?? 'modal-shell'}>
        <button type="button" onClick={onHiding} aria-label="close" />
        {children}
      </div>
    ) : null,
}));

vi.mock('../typography', () => ({
  Typography: ({
    children,
    variant,
    className,
  }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
  }) => (
    <span data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ModalShell', () => {
  const defaultProps = {
    visible: true,
    onHide: vi.fn(),
    icon: <span data-testid="test-icon" />,
    title: 'Test title',
    children: <p>Modal body</p>,
  };

  it('renders when visible is true', () => {
    render(<ModalShell {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test title')).toBeInTheDocument();
    expect(screen.getByText('Modal body')).toBeInTheDocument();
  });

  it('does not render when visible is false', () => {
    render(<ModalShell {...defaultProps} visible={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the icon', () => {
    render(<ModalShell {...defaultProps} />);
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<ModalShell {...defaultProps} description="Supporting text" />);
    expect(screen.getByText('Supporting text')).toBeInTheDocument();
  });

  it('does not render description when omitted', () => {
    render(<ModalShell {...defaultProps} />);
    // only title + body text — no extra Typography for description
    expect(screen.queryByText('Supporting text')).not.toBeInTheDocument();
  });

  it('renders badge when provided', () => {
    render(<ModalShell {...defaultProps} badge={<span data-testid="badge">You</span>} />);
    expect(screen.getByTestId('badge')).toBeInTheDocument();
  });

  it('applies testId to the popup wrapper', () => {
    render(<ModalShell {...defaultProps} testId="my-modal" />);
    expect(screen.getByTestId('my-modal')).toBeInTheDocument();
  });
});
