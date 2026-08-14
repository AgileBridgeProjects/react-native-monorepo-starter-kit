'use client';

import { AuthLayout } from '@features/auth/presentation/components/auth-layout';
import { PasswordField } from '@features/auth/presentation/components/password-field';
import { useAuthButtonStyle } from '@features/auth/presentation/hooks/use-auth-button-style';
import { userDatasource } from '@features/users/infrastructure/datasources/user-datasource';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useTranslation } from '@lib/i18n';
import { ArrowBackIcon } from '@starterkit/icons';
import { iconSize, PASSWORD_COMPLEXITY, PASSWORD_MIN_LENGTH } from '@starterkit/shared';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Spinner, Typography, toast } from '@/components/ui';
import { ApiError } from '@/lib/http/api-error';
import type { ValidateSetupTokenResponse } from '@/proxy/models';
import { SetupTokenPurpose } from '@/proxy/models';
import { PasswordRulesChecklist } from '../components/password-rules-checklist';
import { useCompleteSetup } from '../hooks/use-complete-setup';

function buildSchema(t: (key: string, options?: Record<string, unknown>) => string) {
  return z
    .object({
      newPassword: z
        .string()
        .min(1, t('users:setupAccount.validation.newPasswordRequired'))
        .refine((v) => PASSWORD_COMPLEXITY.test(v), {
          message: t('users:setupAccount.validation.newPasswordComplexity', {
            min: PASSWORD_MIN_LENGTH,
          }),
        }),
      confirmPassword: z
        .string()
        .min(1, t('users:setupAccount.validation.confirmPasswordRequired')),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t('users:setupAccount.validation.passwordsMismatch'),
      path: ['confirmPassword'],
    });
}

type SetupFormValues = z.infer<ReturnType<typeof buildSchema>>;

export function SetupAccountPage() {
  const { t } = useTranslation();
  const authButton = useAuthButtonStyle();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [tokenData, setTokenData] = useState<ValidateSetupTokenResponse | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenInvalid, setIsTokenInvalid] = useState(false);
  const { mutateAsync: completeSetup, isPending } = useCompleteSetup();

  const validateToken = useCallback(async (tokenValue: string) => {
    setIsValidating(true);
    setIsTokenInvalid(false);
    try {
      const data = await userDatasource.validateSetupToken(tokenValue);
      setTokenData(data);
    } catch {
      setIsTokenInvalid(true);
    } finally {
      setIsValidating(false);
    }
  }, []);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<SetupFormValues>({
    resolver: standardSchemaResolver(buildSchema(t)),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPasswordValue = watch('newPassword');

  useEffect(() => {
    if (!token) {
      router.replace('/login');
      return;
    }
    validateToken(token);
  }, [token, router, validateToken]);

  // Re-validate when the user returns to the tab (catches expired tokens).
  useEffect(() => {
    if (!token) return;
    const onFocus = () => validateToken(token);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [token, validateToken]);

  const isPasswordReset = tokenData?.purpose === SetupTokenPurpose.PasswordReset;

  async function onSubmit(values: SetupFormValues) {
    if (!token) return;

    try {
      await completeSetup({ token, newPassword: values.newPassword });
      toast.success(
        isPasswordReset
          ? t('users:setupAccount.successPasswordReset')
          : t('users:setupAccount.success'),
      );
      router.replace('/login');
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes('temporary password')) {
        setError('newPassword', {
          message: t('users:setupAccount.validation.tempPasswordReuse'),
        });
      } else {
        toast.error(message);
      }
    }
  }

  if (!token) {
    return null;
  }

  return (
    <AuthLayout>
      {/* ── Back button — top-left of white panel ── */}
      <Link
        href="/login"
        className="absolute left-md top-md inline-flex items-center gap-xs text-sm text-text-muted transition-colors hover:text-text"
      >
        <ArrowBackIcon size={iconSize.xs} />
        {t('users:setupAccount.backToLogin')}
      </Link>

      <div className="space-y-xl">
        {/* Header */}
        <div className="space-y-xs">
          <Typography variant="h1">
            {isPasswordReset
              ? t('users:setupAccount.titlePasswordReset')
              : t('users:setupAccount.title')}
          </Typography>
          {!isTokenInvalid && !isValidating && (
            <Typography variant="body" className="text-text-secondary">
              {isPasswordReset ? (
                <>
                  {t('users:setupAccount.subtitlePasswordReset')}
                  {tokenData && (
                    <>
                      {' '}
                      {t('users:setupAccount.subtitlePasswordResetEmailPrefix')}{' '}
                      <Typography variant="body" as="span" className="font-semibold text-primary">
                        {tokenData.email}
                      </Typography>
                    </>
                  )}
                </>
              ) : (
                <>
                  {t('users:setupAccount.subtitle')}
                  {tokenData && (
                    <>
                      {' '}
                      {t('users:setupAccount.subtitleEmailPrefix')}{' '}
                      <Typography variant="body" as="span" className="font-semibold text-primary">
                        {tokenData.email}
                      </Typography>
                    </>
                  )}
                </>
              )}
            </Typography>
          )}
        </div>

        {/* Loading state */}
        {isValidating && (
          <div className="flex flex-col items-center gap-md">
            <Spinner className="h-8 w-8" />
            <Typography variant="body" className="text-center text-text-secondary">
              {t('users:setupAccount.tokenLoading')}
            </Typography>
          </div>
        )}

        {/* Invalid token state */}
        {isTokenInvalid && (
          <div className="space-y-md rounded-md border border-border bg-surface p-lg text-center">
            <Typography variant="body" className="text-text-secondary">
              {isPasswordReset
                ? t('users:setupAccount.tokenInvalidPasswordReset')
                : t('users:setupAccount.tokenInvalid')}
            </Typography>
          </div>
        )}

        {/* Setup form */}
        {!isValidating && !isTokenInvalid && tokenData && (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-lg">
            <PasswordField
              id="newPassword"
              label={t('users:setupAccount.newPasswordLabel')}
              placeholder={t('users:setupAccount.newPasswordPlaceholder')}
              error={errors.newPassword?.message}
              showLabel={t('users:setupAccount.a11y.showPassword')}
              hideLabel={t('users:setupAccount.a11y.hidePassword')}
              registration={register('newPassword')}
            />

            <PasswordField
              id="confirmPassword"
              label={t('users:setupAccount.confirmPasswordLabel')}
              placeholder={t('users:setupAccount.confirmPasswordPlaceholder')}
              error={errors.confirmPassword?.message}
              showLabel={t('users:setupAccount.a11y.showPassword')}
              hideLabel={t('users:setupAccount.a11y.hidePassword')}
              registration={register('confirmPassword')}
            />

            <PasswordRulesChecklist
              password={newPasswordValue ?? ''}
              translationFn={t}
              i18nPrefix="users:setupAccount.rules"
            />

            <Button
              type="submit"
              fullWidth
              isLoading={isPending}
              className={authButton.className}
              style={authButton.style}
            >
              {isPasswordReset
                ? t('users:setupAccount.submitButtonPasswordReset')
                : t('users:setupAccount.submitButton')}
            </Button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
