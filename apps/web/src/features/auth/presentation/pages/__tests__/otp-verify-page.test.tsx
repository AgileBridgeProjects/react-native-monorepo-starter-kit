import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeConfirmationResult } from '@/test/factories';
import { renderWithProviders } from '@/test/utils/render-with-providers';

// ─── Hoisted mock fns (must precede vi.mock factories that reference them) ────
const {
  mockGetConfirmationResult,
  mockClearConfirmationResult,
  mockSetConfirmationResult,
  mockMutate,
  mockResendMutate,
  mockReplace,
} = vi.hoisted(() => ({
  mockGetConfirmationResult: vi.fn(),
  mockClearConfirmationResult: vi.fn(),
  mockSetConfirmationResult: vi.fn(),
  mockMutate: vi.fn(),
  mockResendMutate: vi.fn(),
  mockReplace: vi.fn(),
}));

// ─── UI components mock (avoid loading DevExtreme barrel in jsdom) ────────────
vi.mock('@/components/ui', async () => await import('@/test/mocks/ui-mocks'));

// ─── Next.js navigation mock ─────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams('phone=%2B27821234567'),
}));

// ─── Auth hook mock ────────────────────────────────────────────────────────────
vi.mock('@features/auth/presentation/hooks/use-auth', () => ({
  useVerifyOtp: () => ({ mutate: mockMutate, isPending: false }),
  useSendPhoneOtp: () => ({ mutate: mockResendMutate, isPending: false }),
}));

// ─── Phone confirmation mock ──────────────────────────────────────────────────
vi.mock('@features/auth/presentation/hooks/use-phone-confirmation', () => ({
  getConfirmationResult: mockGetConfirmationResult,
  clearConfirmationResult: mockClearConfirmationResult,
  setConfirmationResult: mockSetConfirmationResult,
}));

// ─── i18n mock ────────────────────────────────────────────────────────────────
vi.mock('@lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (params) return `${key}(${JSON.stringify(params)})`;
      return key;
    },
  }),
}));

// ─── next/link mock ───────────────────────────────────────────────────────────
vi.mock(
  'next/link',
  async () => await import('@/test/mocks/navigation-mocks').then((m) => ({ default: m.NextLink })),
);

import { OtpVerifyPage } from '@features/auth/presentation/pages/otp-verify-page';

function renderPage() {
  return renderWithProviders(
    <Suspense>
      <OtpVerifyPage />
    </Suspense>,
  );
}

describe('OtpVerifyPage', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockMutate.mockClear();
    mockResendMutate.mockClear();
    mockSetConfirmationResult.mockClear();
    mockGetConfirmationResult.mockReturnValue(makeConfirmationResult());
  });

  describe('rendering', () => {
    it('renders OTP input, submit button, resend button and back button', () => {
      renderPage();
      expect(screen.getByTestId('otp-verify-code-input')).toBeTruthy();
      expect(screen.getByTestId('otp-verify-submit-button')).toBeTruthy();
      expect(screen.getByTestId('otp-verify-resend-button')).toBeTruthy();
      expect(screen.getByTestId('otp-verify-back-button')).toBeTruthy();
    });

    it('back button links to /login/phone', () => {
      renderPage();
      const back = screen.getByTestId('otp-verify-back-button');
      expect(back.getAttribute('href')).toBe('/login/phone');
    });
  });

  describe('validation', () => {
    it('shows error when code is fewer than 6 digits', async () => {
      renderPage();
      fireEvent.change(screen.getByRole('textbox', { name: 'otp-input' }), {
        target: { value: '123' },
      });
      fireEvent.click(screen.getByTestId('otp-verify-submit-button'));
      await waitFor(() => {
        expect(screen.getByText(/auth:otp\.otpLength/)).toBeTruthy();
      });
    });

    it('shows error when code is empty', async () => {
      renderPage();
      fireEvent.click(screen.getByTestId('otp-verify-submit-button'));
      await waitFor(() => {
        expect(screen.getByText(/auth:otp\.otpLength/)).toBeTruthy();
      });
    });

    it('does not call verifyOtp when validation fails', async () => {
      renderPage();
      fireEvent.click(screen.getByTestId('otp-verify-submit-button'));
      await waitFor(() => {
        expect(mockMutate).not.toHaveBeenCalled();
      });
    });
  });

  describe('no confirmation result', () => {
    it('redirects to /login/phone when no confirmation result is stored', async () => {
      mockGetConfirmationResult.mockReturnValue(null);
      renderPage();
      fireEvent.change(screen.getByRole('textbox', { name: 'otp-input' }), {
        target: { value: '123456' },
      });
      fireEvent.click(screen.getByTestId('otp-verify-submit-button'));
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/login/phone');
      });
    });
  });
});
