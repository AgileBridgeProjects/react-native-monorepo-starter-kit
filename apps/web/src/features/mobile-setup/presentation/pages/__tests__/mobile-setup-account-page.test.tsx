import { render, screen } from '@testing-library/react';
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MobileSetupAccountPage } from '../mobile-setup-account-page';

// ─── Mocks ───────────────────────────────────────────────────────────────────
const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: mockGet }),
}));

vi.mock('@lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/components/ui', () => ({
  Button: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  Typography: ({ children }: { children?: React.ReactNode }) => <p>{children}</p>,
}));

// ─── window.location stub (the page redirects via window.location.href) ───────
const originalLocation = window.location;

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'location', {
    value: { href: '' },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  Object.defineProperty(window, 'location', {
    value: originalLocation,
    writable: true,
    configurable: true,
  });
});

const withToken = (token: string | null, purpose: string | null = null) =>
  mockGet.mockImplementation((key: string) =>
    key === 'token' ? token : key === 'purpose' ? purpose : null,
  );

describe('MobileSetupAccountPage', () => {
  it('shows the missing-token message when no token is present', () => {
    withToken(null);
    render(<MobileSetupAccountPage />);
    expect(screen.getByText('missingToken')).toBeTruthy();
  });

  it('renders the open-in-app CTA when a token is present', () => {
    withToken('abc123');
    render(<MobileSetupAccountPage />);
    expect(screen.getByText('title')).toBeTruthy();
    expect(screen.getByText('openInAppButton')).toBeTruthy();
  });

  it('builds a mobile-setup-account deep link and redirects on mount', () => {
    withToken('abc123');
    render(<MobileSetupAccountPage />);
    expect(window.location.href).toBe('starterkit-mobile-dev://mobile-setup-account?token=abc123');
  });

  it('includes the reset purpose in the deep link when present', () => {
    withToken('abc123', 'reset');
    render(<MobileSetupAccountPage />);
    expect(window.location.href).toBe(
      'starterkit-mobile-dev://mobile-setup-account?token=abc123&purpose=reset',
    );
  });

  it('URL-encodes the token in the deep link', () => {
    withToken('a b/c');
    render(<MobileSetupAccountPage />);
    expect(window.location.href).toBe('starterkit-mobile-dev://mobile-setup-account?token=a%20b%2Fc');
  });
});
