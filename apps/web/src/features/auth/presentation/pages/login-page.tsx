'use client';

import {
  AUTH_TEST_IDS,
  SESSION_TEST_IDS,
  type SessionExpiredReason,
  VALID_SESSION_REASONS,
} from '@features/auth/presentation/auth.copy';
import { AuthLayout } from '@features/auth/presentation/components/auth-layout';
import { PasswordField } from '@features/auth/presentation/components/password-field';
import { SocialSignInButton } from '@features/auth/presentation/components/social-sign-in-button';
import { useAppleSignIn } from '@features/auth/presentation/hooks/use-apple-sign-in';
import { useLogin } from '@features/auth/presentation/hooks/use-auth';
import { useAuthButtonStyle } from '@features/auth/presentation/hooks/use-auth-button-style';
import { useGoogleSignIn } from '@features/auth/presentation/hooks/use-google-sign-in';
import { useMicrosoftSignIn } from '@features/auth/presentation/hooks/use-microsoft-sign-in';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { getErrorMessage } from '@lib/error-message';
import { isSocialAuthEnabled } from '@lib/feature-flags';
import { useTranslation } from '@lib/i18n';
import { lastVisitedPath } from '@lib/last-visited-path';
import { AuthFailure } from '@starterkit/shared';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  AppleBrandIcon,
  Banner,
  Button,
  FormField,
  GoogleBrandIcon,
  MicrosoftBrandIcon,
  Typography,
  toast,
} from '@/components/ui';

interface LoginFormValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const rawReason = searchParams.get('reason');
  const sessionExpiredReason: SessionExpiredReason | null = VALID_SESSION_REASONS.includes(
    rawReason as SessionExpiredReason,
  )
    ? (rawReason as SessionExpiredReason)
    : null;

  const loginSchema = z.object({
    email: z.string().min(1, { error: t('errors:validation.required') }),
    password: z.string().min(1, { error: t('errors:validation.required') }),
  });
  const router = useRouter();
  const authButton = useAuthButtonStyle();
  const { mutate: login, isPending } = useLogin();
  const socialAuthEnabled = isSocialAuthEnabled();

  // Restore the admin to their last visited page after a session-expiry
  // re-login. Falls back to '/' (which routes super admins to /clubs and
  // others to /topics) when no path was stored — i.e. a deliberate sign-out
  // or first login. consume() is idempotent per page load, so it's safe even
  // though requirePublic in the login layout may also call it.
  const redirectAfterLogin = () => router.replace(lastVisitedPath.consume() ?? '/');

  const {
    signIn: signInWithGoogle,
    isLoading: isGooglePending,
    error: googleError,
  } = useGoogleSignIn(redirectAfterLogin);
  const {
    signIn: signInWithApple,
    isLoading: isApplePending,
    error: appleError,
  } = useAppleSignIn(redirectAfterLogin);
  const {
    signIn: signInWithMicrosoft,
    isLoading: isMicrosoftPending,
    error: microsoftError,
  } = useMicrosoftSignIn(redirectAfterLogin);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: standardSchemaResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (values: LoginFormValues) => {
    login(values, {
      onSuccess: redirectAfterLogin,
      onError: (error) => {
        const message =
          error instanceof AuthFailure
            ? t(`errors:${error.localeKey}`, error.localeParams)
            : getErrorMessage(error, t, t('errors:genericError'));
        toast.error(message);
      },
    });
  };

  useEffect(() => {
    if (googleError) {
      const message =
        googleError instanceof AuthFailure
          ? t(`errors:${googleError.localeKey}`, googleError.localeParams)
          : getErrorMessage(googleError, t, t('errors:genericError'));
      toast.error(message);
    }
  }, [googleError, t]);

  useEffect(() => {
    if (appleError) {
      const message =
        appleError instanceof AuthFailure
          ? t(`errors:${appleError.localeKey}`, appleError.localeParams)
          : getErrorMessage(appleError, t, t('errors:genericError'));
      toast.error(message);
    }
  }, [appleError, t]);

  useEffect(() => {
    if (microsoftError) {
      const message =
        microsoftError instanceof AuthFailure
          ? t(`errors:${microsoftError.localeKey}`, microsoftError.localeParams)
          : getErrorMessage(microsoftError, t, t('errors:genericError'));
      toast.error(message);
    }
  }, [microsoftError, t]);

  return (
    <AuthLayout>
      <div className="space-y-xl font-body">
        {sessionExpiredReason && (
          <Banner variant="warning" data-testid={SESSION_TEST_IDS.expiryBanner}>
            {sessionExpiredReason === 'idle'
              ? t('auth:session.expiredIdle')
              : t('auth:session.expiredAbsolute')}
          </Banner>
        )}

        <div>
          <Typography variant="h1" className="font-heading tracking-wide">
            {t('auth:login.title')}
          </Typography>
          <Typography variant="body-sm" className="mt-xs text-text-secondary">
            {t('auth:login.subtitle')}
          </Typography>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-lg">
          <FormField
            label={t('auth:login.emailOrUsernameLabel')}
            htmlFor="email"
            required
            error={errors.email?.message}
          >
            <input
              id="email"
              type="text"
              autoComplete="username"
              placeholder={t('auth:login.emailOrUsernamePlaceholder')}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className="h-12 w-full rounded-md bg-input pl-md pr-sm text-sm text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid={AUTH_TEST_IDS.login.emailInput}
              {...register('email')}
            />
          </FormField>

          <div>
            <PasswordField
              id="password"
              label={t('auth:login.passwordLabel')}
              placeholder="••••••••"
              error={errors.password?.message}
              showLabel={t('common:actions.show')}
              hideLabel={t('common:actions.hide')}
              autoComplete="current-password"
              data-testid={AUTH_TEST_IDS.login.passwordInput}
              registration={register('password')}
            />
            <div className="mt-xs flex justify-end">
              <Link
                href="/forgot-password"
                className="text-xs text-text-secondary hover:text-text hover:underline"
                data-testid={AUTH_TEST_IDS.login.forgotPasswordLink}
              >
                {t('auth:login.forgotPassword')}
              </Link>
            </div>
          </div>

          <Button
            type="submit"
            fullWidth
            isLoading={isPending}
            disabled={isPending}
            data-testid={AUTH_TEST_IDS.login.submitButton}
            className={authButton.className}
            style={authButton.style}
          >
            {isPending ? t('common:actions.signingIn') : t('auth:login.submitButton')}
          </Button>
        </form>

        {/* "or sign in using" divider — introduces the social providers, so it
        is gated with them behind NEXT_PUBLIC_SOCIAL_AUTH_ENABLED. The GoTrue
        providers are disabled for now, so the social buttons would error. */}
        {socialAuthEnabled && (
          <>
            <div className="flex items-center gap-md">
              <div className="h-px flex-1 bg-border" />
              <span className="text-sm text-text-secondary">{t('auth:login.orSignInUsing')}</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Social sign-in row (Google / Apple / Microsoft) */}
            <div className="flex gap-sm">
              <SocialSignInButton
                aria-label={t('auth:login.googleButton')}
                label="Google"
                onClick={signInWithGoogle}
                loading={isGooglePending}
                data-testid={AUTH_TEST_IDS.login.googleButton}
              >
                <GoogleBrandIcon />
              </SocialSignInButton>
              <SocialSignInButton
                aria-label={t('auth:login.appleButton')}
                label="Apple"
                onClick={signInWithApple}
                loading={isApplePending}
                data-testid={AUTH_TEST_IDS.login.appleButton}
              >
                <AppleBrandIcon />
              </SocialSignInButton>
              <SocialSignInButton
                aria-label={t('auth:login.microsoftButton')}
                label="Microsoft"
                onClick={signInWithMicrosoft}
                loading={isMicrosoftPending}
                data-testid={AUTH_TEST_IDS.login.microsoftButton}
              >
                <MicrosoftBrandIcon />
              </SocialSignInButton>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
