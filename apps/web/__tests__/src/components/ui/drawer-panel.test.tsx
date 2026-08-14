import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DrawerPanel } from '@/components/ui/drawer-panel';

// ─── DevExtreme stubs ────────────────────────────────────────────────────────

vi.mock('devextreme-react/button', () => ({
  default: ({
    onClick,
    elementAttr,
  }: {
    onClick?: () => void;
    elementAttr?: Record<string, string>;
  }) => (
    <button type="button" aria-label={elementAttr?.['aria-label']} onClick={onClick}>
      close
    </button>
  ),
}));

vi.mock('devextreme-react/scroll-view', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@lib/i18n', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DrawerPanel', () => {
  const baseProps = {
    title: 'Panel Title',
    visible: true,
    onHide: vi.fn(),
    children: <div>Content</div>,
  };

  it('renders the title', () => {
    render(<DrawerPanel {...baseProps} />);
    expect(screen.getByText('Panel Title')).toBeInTheDocument();
  });

  it('renders the subtitle when provided', () => {
    render(<DrawerPanel {...baseProps} subtitle="Acme Corp" />);
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('does not render a subtitle element when subtitle is omitted', () => {
    render(<DrawerPanel {...baseProps} />);
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument();
  });

  it('renders children', () => {
    render(<DrawerPanel {...baseProps} />);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders nothing visible when not visible', () => {
    render(<DrawerPanel {...baseProps} visible={false} />);
    // panel is inert and slid off screen; the role=dialog has aria-hidden=true
    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('aria-hidden', 'true');
  });
});
