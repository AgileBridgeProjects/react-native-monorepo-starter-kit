import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/utils/render-with-providers';

// ─── Hoisted mock fns (must precede vi.mock factories that reference them) ────
const { mockPush, mockMutate } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockMutate: vi.fn(),
}));

// ─── UI components mock (avoid loading DevExtreme barrel in jsdom) ────────────
vi.mock('@/components/ui', async () => await import('@/test/mocks/ui-mocks'));

// ─── Next.js navigation mock ─────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));

// ─── Auth hook mock ────────────────────────────────────────────────────────────
vi.mock('@features/auth/presentation/hooks/use-auth', () => ({
  useSendPhoneOtp: () => ({ mutate: mockMutate, isPending: false }),
}));

// ─── i18n mock ────────────────────────────────────────────────────────────────
vi.mock('@lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// ─── next/link mock ───────────────────────────────────────────────────────────
vi.mock(
  'next/link',
  async () => await import('@/test/mocks/navigation-mocks').then((m) => ({ default: m.NextLink })),
);

import { PhoneLoginPage } from '@features/auth/presentation/pages/phone-login-page';

function renderPage() {
  return renderWithProviders(<PhoneLoginPage />);
}

describe('PhoneLoginPage', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockMutate.mockClear();
  });

  describe('rendering', () => {
    it('renders the phone input and submit button', () => {
      renderPage();
      expect(screen.getByTestId('phone-login-phone-input')).toBeTruthy();
      expect(screen.getByTestId('phone-login-submit-button')).toBeTruthy();
    });

    it('renders a back-to-email link pointing to /login', () => {
      renderPage();
      const link = screen.getByRole('link', { name: /auth:phone\.backToEmail/i });
      expect(link.getAttribute('href')).toBe('/login');
    });
  });

  describe('validation', () => {
    it('shows phone required error when submitted with empty input', async () => {
      renderPage();
      fireEvent.click(screen.getByTestId('phone-login-submit-button'));
      await waitFor(() => {
        expect(screen.getByText('auth:phone.phoneRequired')).toBeTruthy();
      });
    });

    it('shows phone invalid error for a non-SA number', async () => {
      renderPage();
      fireEvent.change(screen.getByTestId('phone-login-phone-input'), {
        target: { value: '00000' },
      });
      fireEvent.click(screen.getByTestId('phone-login-submit-button'));
      await waitFor(() => {
        expect(screen.getByText('auth:phone.phoneInvalid')).toBeTruthy();
      });
    });

    it('does not call sendOtp when validation fails', async () => {
      renderPage();
      fireEvent.click(screen.getByTestId('phone-login-submit-button'));
      await waitFor(() => {
        expect(mockMutate).not.toHaveBeenCalled();
      });
    });
  });
});
