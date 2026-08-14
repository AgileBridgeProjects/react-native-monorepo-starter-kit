import { AUTH_TEST_IDS } from '@features/auth/presentation/auth.copy';
import { screen } from '@testing-library/react';
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/utils/render-with-providers';

// ─── Hoisted mock fns (must precede vi.mock factories that reference them) ────
const { mockPush, mockReplace, mockLogin } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockReplace: vi.fn(),
  mockLogin: vi.fn(),
}));

// ─── UI components mock (avoid loading DevExtreme barrel in jsdom) ────────────
vi.mock('@/components/ui', async () => {
  const base = await import('@/test/mocks/ui-mocks');
  return {
    ...base,
    Banner: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    GoogleBrandIcon: () => null,
    AppleBrandIcon: () => null,
    MicrosoftBrandIcon: () => null,
  };
});

// SocialSignInButton lives in its own module — stub it to a plain button that
// exposes the test id so gating assertions can query by it.
vi.mock('@features/auth/presentation/components/social-sign-in-button', () => ({
  SocialSignInButton: ({
    'data-testid': testId,
    onClick,
    'aria-label': ariaLabel,
  }: {
    'data-testid'?: string;
    onClick?: () => void;
    'aria-label'?: string;
    children?: React.ReactNode;
    label?: string;
    loading?: boolean;
  }) => <button type="button" data-testid={testId} aria-label={ariaLabel} onClick={onClick} />,
}));

vi.mock('@features/auth/presentation/components/password-field', () => ({
  PasswordField: ({
    'data-testid': testId,
    registration,
  }: {
    'data-testid'?: string;
    registration?: Record<string, unknown>;
    [key: string]: unknown;
  }) => <input type="password" data-testid={testId} {...registration} />,
}));

vi.mock('@features/auth/presentation/components/auth-layout', () => ({
  AuthLayout: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@features/auth/presentation/hooks/use-auth-button-style', () => ({
  useAuthButtonStyle: () => ({ className: '', style: {} }),
}));

// ─── Next.js navigation mock ─────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(),
}));

// ─── Auth + social hook mocks ────────────────────────────────────────────────
vi.mock('@features/auth/presentation/hooks/use-auth', () => ({
  useLogin: () => ({ mutate: mockLogin, isPending: false }),
}));

const socialHookState = { signIn: vi.fn(), isLoading: false, error: null as Error | null };
vi.mock('@features/auth/presentation/hooks/use-google-sign-in', () => ({
  useGoogleSignIn: () => socialHookState,
}));
vi.mock('@features/auth/presentation/hooks/use-apple-sign-in', () => ({
  useAppleSignIn: () => socialHookState,
}));
vi.mock('@features/auth/presentation/hooks/use-microsoft-sign-in', () => ({
  useMicrosoftSignIn: () => socialHookState,
}));

// ─── i18n + next/link mocks ──────────────────────────────────────────────────
vi.mock('@lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock(
  'next/link',
  async () => await import('@/test/mocks/navigation-mocks').then((m) => ({ default: m.NextLink })),
);

import { LoginPage } from '@features/auth/presentation/pages/login-page';

function renderPage() {
  return renderWithProviders(<LoginPage />);
}

const SOCIAL_TEST_IDS = [
  AUTH_TEST_IDS.login.googleButton,
  AUTH_TEST_IDS.login.appleButton,
  AUTH_TEST_IDS.login.microsoftButton,
];

describe('LoginPage', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockLogin.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('email/password form (always rendered)', () => {
    it('renders the email, password and submit controls', () => {
      renderPage();
      expect(screen.getByTestId(AUTH_TEST_IDS.login.emailInput)).toBeTruthy();
      expect(screen.getByTestId(AUTH_TEST_IDS.login.passwordInput)).toBeTruthy();
      expect(screen.getByTestId(AUTH_TEST_IDS.login.submitButton)).toBeTruthy();
    });

    it('does not render the phone sign-in option (removed for v1)', () => {
      renderPage();
      expect(screen.queryByTestId(AUTH_TEST_IDS.login.phoneLink)).toBeNull();
    });
  });

  describe('social sign-in gating', () => {
    it('hides the social buttons and the "or sign in using" divider by default (flag off)', () => {
      renderPage();
      for (const testId of SOCIAL_TEST_IDS) {
        expect(screen.queryByTestId(testId)).toBeNull();
      }
      expect(screen.queryByText('auth:login.orSignInUsing')).toBeNull();
    });

    it('renders the Google, Apple and Microsoft buttons and divider when the flag is on', () => {
      vi.stubEnv('NEXT_PUBLIC_SOCIAL_AUTH_ENABLED', 'true');
      renderPage();
      for (const testId of SOCIAL_TEST_IDS) {
        expect(screen.getByTestId(testId)).toBeTruthy();
      }
      expect(screen.getByText('auth:login.orSignInUsing')).toBeTruthy();
    });
  });
});
